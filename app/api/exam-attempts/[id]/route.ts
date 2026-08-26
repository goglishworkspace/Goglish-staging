import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { buildCorrectAnswerSummary } from "@/lib/services/attempt-review.service";
import type { QuestionType } from "@/lib/services/scoring.service";

type AnswerRow = {
  id: string;
  content: string;
  is_correct: boolean | null;
  order_index: number | null;
  side: "left" | "right" | null;
  match_group: string | null;
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data: attempt, error } = await supabase
    .from("student_exam_attempts")
    .select(
      "id, exam_id, status, score_percent, passed, submitted_at, started_at, auto_submitted, exams(course_id, solutions_visible_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) return apiError("تعذر جلب المحاولة", null, 500);
  if (!attempt) return apiError("المحاولة غير موجودة", null, 404);

  const exam = attempt.exams as unknown as { course_id: string; solutions_visible_at: string | null } | null;
  const { exams: _exams, ...attemptFields } = attempt;

  if (attempt.status !== "submitted") {
    return apiSuccess({ ...attemptFields, course_id: exam?.course_id ?? null }, "المحاولة لسه شغالة");
  }

  // "عرض الحل بعد موعد محدد فقط" - score/pass-fail show right away, but the
  // per-question answer key only unlocks once solutions_visible_at has passed.
  const solutionsVisible = !exam?.solutions_visible_at || new Date(exam.solutions_visible_at) <= new Date();

  const { data: responses } = await supabase
    .from("student_exam_responses")
    .select(
      solutionsVisible
        ? "question_id, response, is_correct, points_awarded, questions(prompt, type, points, answers(id, content, is_correct, order_index, side, match_group))"
        : "question_id, response",
    )
    .eq("attempt_id", id);

  // "معرض إجابة صح تحت كل سؤال غلط" - only ships the correct-answer summary
  // for questions the student actually got wrong, never the raw answer key.
  const reviewedResponses = (responses ?? []).map((r) => {
    const row = r as unknown as {
      question_id: string;
      response: unknown;
      is_correct?: boolean | null;
      points_awarded?: number;
      questions?: { prompt: string; type: QuestionType; points: number; answers: AnswerRow[] | null } | null;
    };
    return {
      question_id: row.question_id,
      response: row.response,
      is_correct: row.is_correct ?? null,
      points_awarded: row.points_awarded ?? null,
      prompt: row.questions?.prompt ?? "",
      type: row.questions?.type ?? null,
      correct_answer:
        row.questions && row.is_correct === false
          ? buildCorrectAnswerSummary(row.questions.type, row.questions.answers ?? [])
          : null,
    };
  });

  return apiSuccess(
    {
      ...attemptFields,
      course_id: exam?.course_id ?? null,
      solutions_visible: solutionsVisible,
      responses: reviewedResponses,
    },
    "نتيجة المحاولة",
  );
}
