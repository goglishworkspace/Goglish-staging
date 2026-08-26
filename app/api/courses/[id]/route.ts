import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { updateCourseSchema } from "@/lib/validation/course.schemas";
import { hasCourseAccess } from "@/lib/services/entitlement.service";
import { getDeletedUserIds } from "@/lib/services/teacher-visibility.service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return apiError("تعذر جلب الكورس", null, 500);
  if (!data) return apiError("الكورس غير موجود", null, 404);

  // has_access powers the Course Page's Enroll-vs-Continue CTA (Phase 9) -
  // false for anonymous visitors, never a whole new endpoint just for this.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const has_access = user ? await hasCourseAccess(supabase, user.id, id) : false;

  // Same two-step M:M lookup as GET /api/courses - course_teachers isn't a
  // sibling-FK PostgREST can embed directly off `courses`. A dedicated
  // GET /api/courses/[id]/teachers already existed for the admin roster UI,
  // but the course detail page never called it, so "مين بيقدم الكورس ده"
  // never showed up here - inlined instead of an extra client round-trip.
  const { data: teacherRows } = await supabase
    .from("course_teachers")
    .select("teachers(id, user_id, teacher_profiles(display_name))")
    .eq("course_id", id);
  const rawTeachers = (teacherRows ?? [])
    .map(
      (row) =>
        row.teachers as unknown as {
          id: string;
          user_id: string;
          teacher_profiles: { display_name: string | null } | null;
        } | null,
    )
    .filter((t): t is NonNullable<typeof t> => !!t);
  const deletedUserIds = await getDeletedUserIds(rawTeachers.map((t) => t.user_id));
  const teachers = rawTeachers
    .filter((t) => !deletedUserIds.has(t.user_id))
    .map((t) => ({ id: t.id, display_name: t.teacher_profiles?.display_name ?? null }));

  return apiSuccess({ ...data, has_access, teachers }, "تم جلب الكورس");
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = updateCourseSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  let isAdmin = false;
  try {
    const { data: roleCheck } = await supabase.rpc("user_has_any_role", {
      p_roles: ["admin", "super_admin", "moderator", "content_manager"],
    });
    isAdmin = !!roleCheck;
  } catch {
    isAdmin = false;
  }

  const updatePayload: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  // If a teacher edits a course, update submitted_at so it surfaces in the admin queue
  if (!isAdmin) {
    updatePayload.submitted_at = new Date().toISOString();
  }

  const { data: updated, error: updateError } = await supabase
    .from("courses")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (updateError) return apiError("تعذر تحديث الكورس", null, 400);
  if (!updated) return apiError("الكورس غير موجود أو ليس لديك صلاحية تعديله", null, 403);
  return apiSuccess(updated, isAdmin ? "تم تحديث الكورس" : "تم حفظ التعديلات وإرسالها للمراجعة");
}

// Soft delete only (Section 23) - actual purge is a separate admin/ops concern.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data, error } = await supabase
    .from("courses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return apiError("تعذر حذف الكورس", null, 400);
  if (!data) return apiError("الكورس غير موجود أو مش مسموح تحذفه", null, 403);
  return apiSuccess(null, "تم حذف الكورس");
}
