import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { scoreAndPersistResponses } from "./attempt-scoring.service";
import { awardXpIfPassed } from "./xp.service";
import { issueCertificateIfEligible } from "./certificate.service";

/** Shared by the exam "submit" and "leave" (anti-cheat auto-submit) routes -
 * scores, finalizes the attempt row, awards XP, and issues a certificate if
 * passed. */
export async function finalizeExamAttempt(params: {
  supabase: SupabaseClient;
  attemptId: string;
  examId: string;
  userId: string;
  passingScorePercent: number;
  xpReward: number;
  coinReward: number;
  examTitle: string;
  studentName: string;
  responses: Array<{ question_id: string; response: unknown }>;
  autoSubmitted: boolean;
  leftWindowAt?: string;
}) {
  const { scorePercent, passed } = await scoreAndPersistResponses(
    params.supabase,
    "student_exam_responses",
    params.attemptId,
    "exam_id",
    params.examId,
    params.passingScorePercent,
    params.responses,
  );

  const updatePayload: Record<string, unknown> = {
    status: "submitted",
    submitted_at: new Date().toISOString(),
    score_percent: scorePercent,
    passed,
    auto_submitted: params.autoSubmitted,
  };
  if (params.leftWindowAt) updatePayload.left_window_at = params.leftWindowAt;

  const { data: updated, error } = await params.supabase
    .from("student_exam_attempts")
    .update(updatePayload)
    .eq("id", params.attemptId)
    .select("id, score_percent, passed, submitted_at, auto_submitted")
    .single();
  if (error) throw error;

  await awardXpIfPassed({
    userId: params.userId,
    sourceType: "exam",
    sourceId: params.examId,
    xpReward: params.xpReward,
    coinReward: params.coinReward,
    passed: !!passed,
  });

  const certificate = await issueCertificateIfEligible({
    userId: params.userId,
    examId: params.examId,
    attemptId: params.attemptId,
    studentName: params.studentName,
    examTitle: params.examTitle,
    scorePercent,
    passed: !!passed,
  });

  return { ...updated, certificate_id: certificate?.certificateId ?? null };
}
