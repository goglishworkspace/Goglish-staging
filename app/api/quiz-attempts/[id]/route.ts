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
    .from("student_quiz_attempts")
    .select("id, quiz_id, status, score_percent, passed, submitted_at, started_at, quizzes(lesson_id)")
    .eq("id", id)
    .maybeSingle();
  if (error) return apiError("تعذر جلب المحاولة", null, 500);
  if (!attempt) return apiError("المحاولة غير موجودة", null, 404);

  // Don't reveal correctness while the attempt is still in progress.
  if (attempt.status !== "submitted") {
    const { quizzes: _quizzes, ...attemptFields } = attempt;
    return apiSuccess(attemptFields, "المحاولة لسه شغالة");
  }

  const { data: responses } = await supabase
    .from("student_quiz_responses")
    .select(
      "question_id, response, is_correct, points_awarded, questions(prompt, type, points, answers(id, content, is_correct, order_index, side, match_group))",
    )
    .eq("attempt_id", id);

  // "معرض إجابة صح تحت كل سؤال غلط" - only ships the correct-answer summary
  // for questions the student actually got wrong, never the raw answer key.
  const reviewedResponses = (responses ?? []).map((r) => {
    const question = r.questions as unknown as {
      prompt: string;
      type: QuestionType;
      points: number;
      answers: AnswerRow[] | null;
    } | null;
    return {
      question_id: r.question_id,
      response: r.response,
      is_correct: r.is_correct,
      points_awarded: r.points_awarded,
      prompt: question?.prompt ?? "",
      type: question?.type ?? null,
      correct_answer:
        question && r.is_correct === false ? buildCorrectAnswerSummary(question.type, question.answers ?? []) : null,
    };
  });

  const quizRel = attempt.quizzes as { lesson_id: string } | { lesson_id: string }[] | null;
  const lessonId = Array.isArray(quizRel) ? quizRel[0]?.lesson_id : quizRel?.lesson_id;
  let navigation: { lesson_id: string | null; module_id: string | null; course_id: string | null } = {
    lesson_id: lessonId ?? null,
    module_id: null,
    course_id: null,
  };
  if (lessonId) {
    const { data: lesson } = await supabase.from("lessons").select("module_id, modules(course_id)").eq("id", lessonId).maybeSingle();
    const modulesRel = lesson?.modules as { course_id: string } | { course_id: string }[] | null;
    const courseId = Array.isArray(modulesRel) ? modulesRel[0]?.course_id : modulesRel?.course_id;
    navigation = { lesson_id: lessonId, module_id: lesson?.module_id ?? null, course_id: courseId ?? null };
  }

  const { quizzes: _quizzes, ...attemptFields } = attempt;
  return apiSuccess({ ...attemptFields, responses: reviewedResponses, ...navigation }, "نتيجة المحاولة");
}
