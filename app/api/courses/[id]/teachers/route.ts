import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { assignCourseTeacherSchema } from "@/lib/validation/course.schemas";
import { userHasAnyRole } from "@/lib/auth/require-role";

const MANAGE_ROLES = ["admin", "super_admin", "content_manager"];

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("course_teachers")
    .select(
      "teacher_id, assigned_at, teachers(id, status, teacher_profiles(display_name, photo_url))",
    )
    .eq("course_id", id);

  if (error) return apiError("تعذر جلب فريق التدريس", null, 500);
  return apiSuccess(data, "تم جلب فريق التدريس");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  const parsed = assignCourseTeacherSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data, error } = await supabase
    .from("course_teachers")
    .insert({ course_id: id, teacher_id: parsed.data.teacher_id })
    .select()
    .single();

  if (error) return apiError("تعذر إضافة المدرس للفريق (ممكن يكون مضاف بالفعل)", null, 400);
  return apiSuccess(data, "تم إضافة المدرس للفريق", 201);
}
