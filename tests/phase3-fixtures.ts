import { createPublishedLesson } from "./phase2-fixtures";

function uniqueTitle(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

/** Lesson (from Phase 2 fixtures) -> published quiz with one MCQ question
 * ("2 + 2 = ?", correct option content is "4"). */
export async function createPublishedQuiz(overrides: Record<string, unknown> = {}) {
  const setup = await createPublishedLesson();
  const { teacher, lessonId } = setup;

  const { json: quizJson } = await teacher.client.post<{ id: string }>("/api/quizzes", {
    lesson_id: lessonId,
    title: uniqueTitle("quiz"),
    passing_score_percent: 50,
    xp_reward: 10,
    ...overrides,
  });
  const quizId = quizJson!.data!.id;

  const { json: mcqJson } = await teacher.client.post<{ id: string }>(`/api/quizzes/${quizId}/questions`, {
    type: "mcq",
    prompt: "2 + 2 = ?",
    order_index: 0,
    options: [
      { content: "3", is_correct: false },
      { content: "4", is_correct: true },
    ],
  });

  await teacher.client.patch(`/api/quizzes/${quizId}`, { status: "published" });

  return { ...setup, quizId, mcqQuestionId: mcqJson!.data!.id };
}

/** Course (from Phase 2 fixtures) -> published exam with one MCQ question
 * ("5 + 5 = ?", correct option content is "10"). */
export async function createPublishedExam(overrides: Record<string, unknown> = {}) {
  const setup = await createPublishedLesson();
  const { teacher, courseId } = setup;

  const { json: examJson } = await teacher.client.post<{ id: string }>("/api/exams", {
    course_id: courseId,
    title: uniqueTitle("exam"),
    passing_score_percent: 50,
    xp_reward: 50,
    ...overrides,
  });
  const examId = examJson!.data!.id;

  const { json: mcqJson } = await teacher.client.post<{ id: string }>(`/api/exams/${examId}/questions`, {
    type: "mcq",
    prompt: "5 + 5 = ?",
    order_index: 0,
    options: [
      { content: "9", is_correct: false },
      { content: "10", is_correct: true },
    ],
  });

  await teacher.client.patch(`/api/exams/${examId}`, { status: "published" });

  return { ...setup, examId, mcqQuestionId: mcqJson!.data!.id };
}
