import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({ teacher_id: z.uuid("teacher_id غير صالح") });

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data, error } = await supabase
    .from("favorite_teachers")
    .select("teacher_id, created_at, teachers(id, teacher_profiles(display_name, photo_url))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return apiError("تعذر جلب المدرسين المفضّلين", null, 500);
  return apiSuccess(data, "تم جلب المدرسين المفضّلين");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { error } = await supabase
    .from("favorite_teachers")
    .upsert({ user_id: user.id, teacher_id: parsed.data.teacher_id }, { onConflict: "user_id,teacher_id" });
  if (error) return apiError("تعذر إضافة المدرس للمفضلة", null, 400);
  return apiSuccess(null, "تم إضافة المدرس للمفضلة", 201);
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const teacherId = request.nextUrl.searchParams.get("teacher_id");
  const parsed = bodySchema.safeParse({ teacher_id: teacherId });
  if (!parsed.success) return apiError("teacher_id مطلوب وصالح", null, 400);

  const { error, count } = await supabase
    .from("favorite_teachers")
    .delete({ count: "exact" })
    .eq("user_id", user.id)
    .eq("teacher_id", parsed.data.teacher_id);

  if (error) return apiError("تعذر إزالة المدرس من المفضلة", null, 400);
  if (!count) return apiError("المدرس مش في المفضلة", null, 404);
  return apiSuccess(null, "تم إزالة المدرس من المفضلة");
}
