import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { updateTeacherProfileSchema } from "@/lib/validation/teacher.schemas";

async function getOwnTeacher(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  return supabase
    .from("teachers")
    .select(
      "id, status, created_at, teacher_profiles(display_name, bio, photo_url, experience_years, rating_avg, rating_count)",
    )
    .eq("user_id", userId)
    .maybeSingle();
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data, error } = await getOwnTeacher(supabase, user.id);
  if (error) return apiError("تعذر جلب بيانات المدرس", null, 500);
  if (!data) return apiError("مفيش حساب مدرس مرتبط بالمستخدم ده", null, 404);
  return apiSuccess(data, "تم جلب بيانات المدرس");
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!teacher) return apiError("مفيش حساب مدرس مرتبط بالمستخدم ده", null, 404);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = updateTeacherProfileSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { error } = await supabase
    .from("teacher_profiles")
    .update(parsed.data)
    .eq("teacher_id", teacher.id);
  if (error) return apiError("تعذر تحديث ملف المدرس", null, 500);

  const { data } = await getOwnTeacher(supabase, user.id);
  return apiSuccess(data, "تم تحديث الملف");
}
