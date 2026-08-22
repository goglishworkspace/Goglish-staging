import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCourseSchema } from "@/lib/validation/course.schemas";
import { attachTeachers } from "@/lib/services/course-teachers.service";
import { attachCourseAccess } from "@/lib/services/entitlement.service";

export async function GET(request: NextRequest) {
  const subjectId = request.nextUrl.searchParams.get("subject_id");
  const teacherId = request.nextUrl.searchParams.get("teacher_id");
  const gradeId = request.nextUrl.searchParams.get("grade_id");
  const limitParam = request.nextUrl.searchParams.get("limit");
  const supabase = await createClient();

  // RLS already scopes rows to "published, or mine to manage" - no extra
  // status filter needed here, it would only ever narrow what RLS allows.
  // subjects(name, grades(name)) is always selected - CourseCard shows the
  // course's grade under the teacher name. !inner only when gradeId is
  // actually filtered on, so the filter genuinely excludes non-matching
  // rows rather than just nulling out their embedded subject.
  let query = gradeId
    ? supabase.from("courses").select("*, subjects!inner(name, grades(name))").eq("subjects.grade_id", gradeId)
    : supabase.from("courses").select("*, subjects(name, grades(name))");
  query = query.is("deleted_at", null).order("created_at", { ascending: false });
  if (subjectId) query = query.eq("subject_id", subjectId);

  if (teacherId) {
    // course_teachers is a plain M:M junction (not a sibling-FK situation),
    // but resolved as a separate lookup + .in() rather than an embed-filter
    // to match this codebase's established two-step-join style.
    const { data: assignments, error: assignmentsError } = await supabase
      .from("course_teachers")
      .select("course_id")
      .eq("teacher_id", teacherId);
    if (assignmentsError) return apiError("تعذر جلب كورسات المدرس", null, 500);
    const courseIds = (assignments ?? []).map((row) => row.course_id);
    if (!courseIds.length) return apiSuccess([], "تم جلب الكورسات");
    query = query.in("id", courseIds);
  }

  const limit = limitParam ? Number(limitParam) : null;
  if (limit && Number.isFinite(limit) && limit > 0) query = query.limit(limit);

  const { data, error } = await query;
  if (error) return apiError("تعذر جلب الكورسات", null, 500);

  const withTeachers = await attachTeachers(supabase, data ?? []);
  const withAccess = await attachCourseAccess(supabase, withTeachers);
  return apiSuccess(withAccess, "تم جلب الكورسات");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = createCourseSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data, error } = await supabase
    .from("courses")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single();

  if (error) {
    return apiError("تعذر إنشاء الكورس (لازم تكون مدرس أو أدمن، والـ slug مش مكرر)", null, 403);
  }

  // course_teachers is a separate M:M roster from created_by (Section 6 -
  // an admin can staff more teachers onto a course later) - but a teacher
  // who just created a course needs to see it in their own "teacher_id"
  // filtered course list right away, and course_teachers writes are
  // admin-only under RLS (see phase2_rls.sql), so the creator's own session
  // client can't self-assign here. The admin client does it on their behalf,
  // scoped to only running when the creator actually has a teacher account.
  const admin = createAdminClient();
  const { data: teacher } = await admin.from("teachers").select("id").eq("user_id", user.id).maybeSingle();
  if (teacher) {
    await admin.from("course_teachers").insert({ course_id: data.id, teacher_id: teacher.id });
  }

  return apiSuccess(data, "تم إنشاء الكورس كمسودة", 201);
}
