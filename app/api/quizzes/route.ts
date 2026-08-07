import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createQuizSchema } from "@/lib/validation/quiz.schemas";

export async function GET(request: NextRequest) {
  const lessonId = request.nextUrl.searchParams.get("lesson_id");
  if (!lessonId) return apiError("lesson_id مطلوب", null, 400);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quizzes")
    .select(
      "id, lesson_id, kind, title, max_attempts, time_limit_seconds, passing_score_percent, xp_reward, coin_reward, status, created_at",
    )
    .eq("lesson_id", lessonId);

  if (error) return apiError("تعذر جلب الكويزات", null, 500);
  return apiSuccess(data, "تم جلب الكويزات");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = createQuizSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data, error } = await supabase
    .from("quizzes")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single();

  if (error) return apiError("تعذر إنشاء الكويز (لازم تقدر تدير الدرس ده)", null, 403);
  return apiSuccess(data, "تم إنشاء الكويز", 201);
}
