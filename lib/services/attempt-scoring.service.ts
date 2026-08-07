import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  scoreResponse,
  scoreAttempt,
  type QuestionForScoring,
  type AnswerForScoring,
  type AttemptScore,
} from "./scoring.service";

type ResponseTable = "student_quiz_responses" | "student_exam_responses";
type ParentColumn = "quiz_id" | "exam_id";

/** Shared by quiz-attempts and exam-attempts submit routes: fetch questions
 * + answers for the parent quiz/exam, score every submitted response, persist
 * them, and return the aggregate attempt score. */
export async function scoreAndPersistResponses(
  supabase: SupabaseClient,
  table: ResponseTable,
  attemptId: string,
  parentColumn: ParentColumn,
  parentId: string,
  passingScorePercent: number,
  submittedResponses: Array<{ question_id: string; response: unknown }>,
): Promise<AttemptScore> {
  const { data: questions, error: qError } = await supabase
    .from("questions")
    .select("id, type, points, answers(id, content, is_correct, order_index, side, match_group)")
    .eq(parentColumn, parentId);
  if (qError) throw qError;

  const questionsById = new Map((questions ?? []).map((q) => [q.id, q]));

  const rows = submittedResponses.flatMap((submitted) => {
    const question = questionsById.get(submitted.question_id);
    if (!question) return [];

    const scored = scoreResponse(
      { id: question.id, type: question.type as QuestionForScoring["type"], points: question.points },
      (question.answers ?? []) as unknown as AnswerForScoring[],
      submitted.response,
    );

    return [
      {
        attempt_id: attemptId,
        question_id: submitted.question_id,
        response: submitted.response,
        is_correct: scored.isCorrect,
        points_awarded: scored.pointsAwarded,
      },
    ];
  });

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from(table)
      .upsert(rows, { onConflict: "attempt_id,question_id" });
    if (insertError) throw insertError;
  }

  const allQuestions: QuestionForScoring[] = (questions ?? []).map((q) => ({
    id: q.id,
    type: q.type as QuestionForScoring["type"],
    points: q.points,
  }));
  const scoredResponses = rows.map((r) => ({ isCorrect: r.is_correct, pointsAwarded: r.points_awarded }));

  return scoreAttempt(allQuestions, passingScorePercent, scoredResponses);
}
