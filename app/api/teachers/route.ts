import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTeacherSchema } from "@/lib/validation/teacher.schemas";
import { userHasAnyRole } from "@/lib/auth/require-role";

const MANAGE_ROLES = ["admin", "super_admin", "support"];

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teachers")
    .select(
      "id, status, created_at, teacher_profiles(display_name, bio, photo_url, experience_years, rating_avg, rating_count)",
    )
    .eq("status", "active");

  if (error) return apiError("تعذر جلب المدرسين", null, 500);

  // A freshly-assigned teacher gets an auto-created teacher_profiles row with
  // no display_name until they fill their profile in (create_teacher_profile
  // trigger only sets teacher_id) - exclude those from the public listing so
  // an incomplete profile never reaches the landing page's TeacherCard.
  const complete = (data ?? []).filter((teacher) => {
    const profile = Array.isArray(teacher.teacher_profiles)
      ? teacher.teacher_profiles[0]
      : teacher.teacher_profiles;
    return !!profile?.display_name;
  });

  return apiSuccess(complete, "تم جلب المدرسين");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = createTeacherSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { user_id, display_name, bio, photo_url, experience_years } = parsed.data;

  const { data: teacher, error: teacherError } = await supabase
    .from("teachers")
    .insert({ user_id })
    .select()
    .single();
  if (teacherError) {
    return apiError("تعذر إنشاء حساب المدرس (تأكد إن المستخدم مش مدرس بالفعل)", null, 400);
  }

  const { error: profileError } = await supabase
    .from("teacher_profiles")
    .update({ display_name, bio, photo_url, experience_years })
    .eq("teacher_id", teacher.id);
  if (profileError) return apiError("تعذر حفظ بيانات ملف المدرس", null, 500);

  // Role assignment needs the admin client: not every MANAGE_ROLES member
  // (e.g. support) is allowed to write role_user directly under RLS.
  const admin = createAdminClient();
  const { data: teacherRole } = await admin.from("roles").select("id").eq("name", "teacher").single();
  if (teacherRole) {
    await admin.from("role_user").upsert(
      { user_id, role_id: teacherRole.id },
      { onConflict: "user_id,role_id", ignoreDuplicates: true },
    );
  }

  return apiSuccess(teacher, "تم إنشاء المدرس", 201);
}
