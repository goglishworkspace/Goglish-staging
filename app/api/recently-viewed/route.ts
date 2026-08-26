import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({ course_id: z.uuid("course_id غير صالح") });
const RECENT_LIMIT = 10;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data, error } = await supabase
    .from("recently_viewed_courses")
    .select("course_id, viewed_at, courses(id, title, slug, cover_image_url)")
    .eq("user_id", user.id)
    .order("viewed_at", { ascending: false })
    .limit(RECENT_LIMIT);

  if (error) return apiError("تعذر جلب آخر ما تمت مشاهدته", null, 500);
  return apiSuccess(data, "تم جلب آخر ما تمت مشاهدته");
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

  const { error } = await supabase.from("recently_viewed_courses").upsert(
    { user_id: user.id, course_id: parsed.data.course_id, viewed_at: new Date().toISOString() },
    { onConflict: "user_id,course_id" },
  );
  if (error) return apiError("تعذر تسجيل المشاهدة", null, 400);
  return apiSuccess(null, "تم تسجيل المشاهدة");
}
