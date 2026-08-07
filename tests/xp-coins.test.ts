import { describe, it, expect, afterAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserRegistry } from "./cleanup";
import { createLoggedInStudent, grantCourseAccess } from "./phase2-fixtures";
import { createPublishedQuiz, createPublishedExam } from "./phase3-fixtures";
import { passQuiz, passExam } from "./gamification-fixtures";

describe("XP + Coins on quiz/exam completion", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("awards XP and coins for a passed quiz, with subject_id resolved on the ledger row", async () => {
    const { admin, teacher, courseId, quizId, subjectId } = await createPublishedQuiz();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);
    await grantCourseAccess(userId, courseId);

    const submitRes = await passQuiz(client, quizId);
    expect(submitRes.json?.data?.passed).toBe(true);

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("xp_total, coins_total")
      .eq("id", userId)
      .single();
    // 10/5 from the quiz + 5/2 from the Daily Streak bonus (first activity).
    expect(profile?.xp_total).toBe(15);
    expect(profile?.coins_total).toBe(7);

    const { data: xpTx } = await supabase
      .from("xp_transactions")
      .select("amount, subject_id, source_type")
      .eq("user_id", userId)
      .eq("source_id", quizId)
      .single();
    expect(xpTx?.amount).toBe(10);
    expect(xpTx?.subject_id).toBe(subjectId);
    expect(xpTx?.source_type).toBe("quiz");

    const { data: coinTx } = await supabase
      .from("coin_transactions")
      .select("amount, source_type")
      .eq("user_id", userId)
      .eq("source_id", quizId)
      .single();
    expect(coinTx?.amount).toBe(5);
    expect(coinTx?.source_type).toBe("quiz");
  });

  it("awards XP and coins for a passed exam, with subject_id resolved via course_id", async () => {
    const { admin, teacher, courseId, examId, subjectId } = await createPublishedExam();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);
    await grantCourseAccess(userId, courseId);

    const submitRes = await passExam(client, examId);
    expect(submitRes.json?.data?.passed).toBe(true);

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("xp_total, coins_total")
      .eq("id", userId)
      .single();
    // 50/20 from the exam + 5/2 from the Daily Streak bonus (first activity).
    expect(profile?.xp_total).toBe(55);
    expect(profile?.coins_total).toBe(22);

    const { data: xpTx } = await supabase
      .from("xp_transactions")
      .select("subject_id")
      .eq("user_id", userId)
      .eq("source_id", examId)
      .single();
    expect(xpTx?.subject_id).toBe(subjectId);
  });

  it("awards nothing for a failed quiz attempt", async () => {
    const { admin, teacher, courseId, quizId } = await createPublishedQuiz();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);
    await grantCourseAccess(userId, courseId);

    const { json: startJson } = await client.post<{
      attempt_id: string;
      questions: Array<{ id: string; answers: Array<{ id: string; content: string }> }>;
    }>(`/api/quizzes/${quizId}/start`);
    const attemptId = startJson!.data!.attempt_id;
    const question = startJson!.data!.questions[0];
    const wrongAnswer = question.answers.find((a) => a.content === "3")!;

    await client.post(`/api/quiz-attempts/${attemptId}/submit`, {
      responses: [{ question_id: question.id, response: wrongAnswer.id }],
    });

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("xp_total, coins_total")
      .eq("id", userId)
      .single();
    expect(profile?.xp_total).toBe(0);
    expect(profile?.coins_total).toBe(0);
  });
});
