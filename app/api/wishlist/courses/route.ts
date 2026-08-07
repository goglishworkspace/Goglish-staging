import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({ course_id: z.uuid("course_id غير صالح") });

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data, error } = await supabase
    .from("course_wishlist")
    .select("course_id, created_at, courses(id, title, slug, cover_image_url)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return apiError("تعذر جلب المفضلة", null, 500);
  return apiSuccess(data, "تم جلب المفضلة");
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
    .from("course_wishlist")
    .upsert({ user_id: user.id, course_id: parsed.data.course_id }, { onConflict: "user_id,course_id" });
  if (error) return apiError("تعذر إضافة الكورس للمفضلة", null, 400);
  return apiSuccess(null, "تم إضافة الكورس للمفضلة", 201);
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const courseId = request.nextUrl.searchParams.get("course_id");
  const parsed = bodySchema.safeParse({ course_id: courseId });
  if (!parsed.success) return apiError("course_id مطلوب وصالح", null, 400);

  const { error, count } = await supabase
    .from("course_wishlist")
    .delete({ count: "exact" })
    .eq("user_id", user.id)
    .eq("course_id", parsed.data.course_id);

  if (error) return apiError("تعذر إزالة الكورس من المفضلة", null, 400);
  if (!count) return apiError("الكورس مش في المفضلة", null, 404);
  return apiSuccess(null, "تم إزالة الكورس من المفضلة");
}
