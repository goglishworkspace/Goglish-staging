import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { submitAttemptSchema } from "@/lib/validation/attempt.schemas";
import { scoreAndPersistResponses } from "@/lib/services/attempt-scoring.service";
import { awardXpIfPassed } from "@/lib/services/xp.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data: attempt, error: attemptError } = await supabase
    .from("student_quiz_attempts")
    .select("id, quiz_id, status, user_id, quizzes(passing_score_percent, xp_reward, coin_reward)")
    .eq("id", id)
    .maybeSingle();
  if (attemptError) return apiError("تعذر جلب المحاولة", null, 500);
  if (!attempt) return apiError("المحاولة غير موجودة", null, 404);
  if (attempt.user_id !== user.id) return apiError("مش مسموح لك بتسليم المحاولة دي", null, 403);
  if (attempt.status === "submitted") return apiError("المحاولة دي اتسلّمت بالفعل", null, 409);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = submitAttemptSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const quiz = attempt.quizzes as unknown as {
    passing_score_percent: number;
    xp_reward: number;
    coin_reward: number;
  };

  // student_quiz_attempts/student_quiz_responses no longer grant authenticated
  // UPDATE (supabase/migrations/20260801100021_security_fix_attempts_rls.sql) -
  // scoring is a trusted server computation, not a client-supplied value, so
  // it must write through the admin client. The ownership check above still
  // runs on the session client/RLS.
  const admin = createAdminClient();

  const { scorePercent, passed } = await scoreAndPersistResponses(
    admin,
    "student_quiz_responses",
    id,
    "quiz_id",
    attempt.quiz_id,
    quiz.passing_score_percent,
    parsed.data.responses,
  );

  const { data: updated, error: updateError } = await admin
    .from("student_quiz_attempts")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      score_percent: scorePercent,
      passed,
    })
    .eq("id", id)
    .select("id, score_percent, passed, submitted_at")
    .single();
  if (updateError) return apiError("تعذر تسليم المحاولة", null, 500);

  await awardXpIfPassed({
    userId: user.id,
    sourceType: "quiz",
    sourceId: attempt.quiz_id,
    xpReward: quiz.xp_reward,
    coinReward: quiz.coin_reward,
    passed: !!passed,
  });

  return apiSuccess(updated, "تم تسليم الكويز");
}
