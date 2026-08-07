import type { TestClient } from "./http-client";

type StartData = {
  attempt_id: string;
  questions: Array<{ id: string; answers: Array<{ id: string; content: string }> }>;
};
type SubmitData = { score_percent: number; passed: boolean };

/** Passes the quiz created by phase3-fixtures.ts's createPublishedQuiz()
 * (fixed question "2 + 2 = ?", correct answer content "4"). */
export async function passQuiz(client: TestClient, quizId: string) {
  const { json: startJson } = await client.post<StartData>(`/api/quizzes/${quizId}/start`);
  const attemptId = startJson!.data!.attempt_id;
  const question = startJson!.data!.questions[0];
  const correctAnswer = question.answers.find((a) => a.content === "4")!;

  return client.post<SubmitData>(`/api/quiz-attempts/${attemptId}/submit`, {
    responses: [{ question_id: question.id, response: correctAnswer.id }],
  });
}

/** Passes the exam created by phase3-fixtures.ts's createPublishedExam()
 * (fixed question "5 + 5 = ?", correct answer content "10"). */
export async function passExam(client: TestClient, examId: string) {
  const { json: startJson } = await client.post<StartData>(`/api/exams/${examId}/start`);
  const attemptId = startJson!.data!.attempt_id;
  const question = startJson!.data!.questions[0];
  const correctAnswer = question.answers.find((a) => a.content === "10")!;

  return client.post<SubmitData>(`/api/exam-attempts/${attemptId}/submit`, {
    responses: [{ question_id: question.id, response: correctAnswer.id }],
  });
}
