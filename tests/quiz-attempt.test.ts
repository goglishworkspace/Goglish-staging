import { describe, it, expect, afterAll } from "vitest";
import { createUserRegistry } from "./cleanup";
import { createLoggedInStudent, grantCourseAccess } from "./phase2-fixtures";
import { createPublishedQuiz } from "./phase3-fixtures";
import { createAdminClient } from "@/lib/supabase/admin";

type StartData = { attempt_id: string; questions: Array<{ id: string; answers: Array<{ id: string; content: string }> }> };
type SubmitData = { score_percent: number; passed: boolean };

describe("Quiz attempts", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("starts a quiz, submits a correct answer, passes, and awards XP", async () => {
    const { admin, teacher, courseId, quizId } = await createPublishedQuiz();
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);
    await grantCourseAccess(userId, courseId);

    const startRes = await client.post<StartData>(`/api/quizzes/${quizId}/start`);
    expect(startRes.status).toBe(201);
    const attemptId = startRes.json!.data!.attempt_id;
    const question = startRes.json!.data!.questions[0];
    const correctAnswer = question.answers.find((a) => a.content === "4")!;
    expect(correctAnswer).toBeTruthy();

    const submitRes = await client.post<SubmitData>(`/api/quiz-attempts/${attemptId}/submit`, {
      responses: [{ question_id: question.id, response: correctAnswer.id }],
    });
    expect(submitRes.status).toBe(200);
    expect(submitRes.json?.data?.score_percent).toBe(100);
    expect(submitRes.json?.data?.passed).toBe(true);

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient.from("profiles").select("xp_total").eq("id", userId).single();
    // 10 from the quiz + 5 from the Daily Streak bonus (Phase 5 - this is
    // this student's first study activity ever).
    expect(profile?.xp_total).toBe(15);

    const { data: tx } = await adminClient
      .from("xp_transactions")
      .select("amount, reason")
      .eq("user_id", userId)
      .eq("source_id", quizId)
      .maybeSingle();
    expect(tx?.amount).toBe(10);
    expect(tx?.reason).toBe("quiz_passed");
  });

  it("scores a wrong answer as 0% and does not award XP", async () => {
    const { admin, teacher, courseId, quizId } = await createPublishedQuiz();
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);
    await grantCourseAccess(userId, courseId);

    const startRes = await client.post<StartData>(`/api/quizzes/${quizId}/start`);
    const attemptId = startRes.json!.data!.attempt_id;
    const question = startRes.json!.data!.questions[0];
    const wrongAnswer = question.answers.find((a) => a.content === "3")!;

    const submitRes = await client.post<SubmitData>(`/api/quiz-attempts/${attemptId}/submit`, {
      responses: [{ question_id: question.id, response: wrongAnswer.id }],
    });
    expect(submitRes.json?.data?.score_percent).toBe(0);
    expect(submitRes.json?.data?.passed).toBe(false);

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient.from("profiles").select("xp_total").eq("id", userId).single();
    expect(profile?.xp_total).toBe(0);
  });

  it("rejects submitting the same attempt twice", async () => {
    const { admin, teacher, courseId, quizId } = await createPublishedQuiz();
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);
    await grantCourseAccess(userId, courseId);

    const startRes = await client.post<StartData>(`/api/quizzes/${quizId}/start`);
    const attemptId = startRes.json!.data!.attempt_id;
    const question = startRes.json!.data!.questions[0];

    const body = { responses: [{ question_id: question.id, response: question.answers[0].id }] };
    const first = await client.post(`/api/quiz-attempts/${attemptId}/submit`, body);
    expect(first.status).toBe(200);

    const second = await client.post(`/api/quiz-attempts/${attemptId}/submit`, body);
    expect(second.status).toBe(409);
  });

  it("respects max_attempts", async () => {
    const { admin, teacher, courseId, quizId } = await createPublishedQuiz({ max_attempts: 1 });
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);
    await grantCourseAccess(userId, courseId);

    const startRes = await client.post<StartData>(`/api/quizzes/${quizId}/start`);
    const attemptId = startRes.json!.data!.attempt_id;
    const question = startRes.json!.data!.questions[0];
    await client.post(`/api/quiz-attempts/${attemptId}/submit`, {
      responses: [{ question_id: question.id, response: question.answers[0].id }],
    });

    const secondStart = await client.post(`/api/quizzes/${quizId}/start`);
    expect(secondStart.status).toBe(403);
  });
});
