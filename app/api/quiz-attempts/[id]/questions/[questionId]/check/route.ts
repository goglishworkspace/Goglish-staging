import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAnswerSchema } from "@/lib/validation/attempt.schemas";
import { scoreResponse, type QuestionType } from "@/lib/services/scoring.service";

/** Instant per-question feedback for quiz practice mode (Q&A one-at-a-time
 * UI) - scores a single response on demand without touching
 * student_quiz_responses (the final bulk submit is still the record of
 * truth). Only ever returns the hint when the answer is actually wrong -
 * a correct/unanswered check never sees it. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> },
) {
  const { id, questionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data: attempt, error: attemptError } = await supabase
    .from("student_quiz_attempts")
    .select("id, quiz_id, user_id, status")
    .eq("id", id)
    .maybeSingle();
  if (attemptError) return apiError("تعذر جلب المحاولة", null, 500);
  if (!attempt) return apiError("المحاولة غير موجودة", null, 404);
  if (attempt.user_id !== user.id) return apiError("مش مسموح لك بالإجراء ده", null, 403);
  if (attempt.status !== "in_progress") return apiError("المحاولة دي مش شغالة دلوقت", null, 409);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = checkAnswerSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  // Answer keys (is_correct) and the hint are staff-only via RLS - reading
  // them here is a trusted server computation gated by the ownership/status
  // checks above, same reasoning as the bulk submit route's admin client use.
  const admin = createAdminClient();
  const { data: question, error: questionError } = await admin
    .from("questions")
    .select("id, type, points, hint")
    .eq("id", questionId)
    .eq("quiz_id", attempt.quiz_id)
    .maybeSingle();
  if (questionError) return apiError("تعذر جلب السؤال", null, 500);
  if (!question) return apiError("السؤال غير موجود", null, 404);

  const { data: answers, error: answersError } = await admin
    .from("answers")
    .select("id, content, is_correct, order_index, side, match_group")
    .eq("question_id", questionId);
  if (answersError) return apiError("تعذر جلب إجابات السؤال", null, 500);

  const result = scoreResponse(
    { id: question.id, type: question.type as QuestionType, points: question.points },
    answers ?? [],
    parsed.data.response,
  );

  return apiSuccess(
    { is_correct: result.isCorrect, hint: result.isCorrect === false ? question.hint : null },
    "تم التحقق من الإجابة",
  );
}
