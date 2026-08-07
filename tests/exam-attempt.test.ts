import { describe, it, expect, afterAll } from "vitest";
import { createUserRegistry } from "./cleanup";
import { createLoggedInStudent, grantCourseAccess } from "./phase2-fixtures";
import { createPublishedExam } from "./phase3-fixtures";
import { createAdminClient } from "@/lib/supabase/admin";

type StartData = {
  attempt_id: string;
  already_submitted?: boolean;
  questions?: Array<{ id: string; answers: Array<{ id: string; content: string }> }>;
};
type SubmitData = { score_percent: number; passed: boolean; certificate_id: string | null };

describe("Exam attempts", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it(
    "passes an exam and issues a downloadable certificate",
    async () => {
      const { admin, teacher, courseId, examId } = await createPublishedExam();
      registry.track(admin.userId);
      registry.track(teacher.userId);

      const { client, userId } = await createLoggedInStudent();
      registry.track(userId);
      await grantCourseAccess(userId, courseId);

      const startRes = await client.post<StartData>(`/api/exams/${examId}/start`);
      expect(startRes.status).toBe(201);
      const attemptId = startRes.json!.data!.attempt_id;
      const question = startRes.json!.data!.questions![0];
      const correctAnswer = question.answers.find((a) => a.content === "10")!;
      expect(correctAnswer).toBeTruthy();

      const submitRes = await client.post<SubmitData>(`/api/exam-attempts/${attemptId}/submit`, {
        responses: [{ question_id: question.id, response: correctAnswer.id }],
      });
      expect(submitRes.status).toBe(200);
      expect(submitRes.json?.data?.passed).toBe(true);
      expect(submitRes.json?.data?.certificate_id).toBeTruthy();

      const certList = await client.get<Array<{ id: string }>>("/api/certificates");
      expect(certList.json?.data?.length).toBe(1);

      const signedUrl = await client.get<{ url: string }>(
        `/api/certificates/${submitRes.json!.data!.certificate_id}/signed-url`,
      );
      expect(signedUrl.status).toBe(200);
      expect(signedUrl.json?.data?.url).toContain("http");
    },
    30000,
  );

  it("does not issue a certificate on failure", async () => {
    const { admin, teacher, courseId, examId } = await createPublishedExam();
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);
    await grantCourseAccess(userId, courseId);

    const startRes = await client.post<StartData>(`/api/exams/${examId}/start`);
    const attemptId = startRes.json!.data!.attempt_id;
    const question = startRes.json!.data!.questions![0];
    const wrongAnswer = question.answers.find((a) => a.content === "9")!;

    const submitRes = await client.post<SubmitData>(`/api/exam-attempts/${attemptId}/submit`, {
      responses: [{ question_id: question.id, response: wrongAnswer.id }],
    });
    expect(submitRes.json?.data?.passed).toBe(false);
    expect(submitRes.json?.data?.certificate_id).toBeNull();
  });

  it("allows only one attempt ever, enforced at the DB level too", async () => {
    const { admin, teacher, courseId, examId } = await createPublishedExam();
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);
    await grantCourseAccess(userId, courseId);

    const startRes = await client.post<StartData>(`/api/exams/${examId}/start`);
    const attemptId = startRes.json!.data!.attempt_id;
    const question = startRes.json!.data!.questions![0];
    await client.post(`/api/exam-attempts/${attemptId}/submit`, {
      responses: [{ question_id: question.id, response: question.answers[0].id }],
    });

    const secondStart = await client.post<StartData>(`/api/exams/${examId}/start`);
    expect(secondStart.status).toBe(200);
    expect(secondStart.json?.data?.already_submitted).toBe(true);

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("student_exam_attempts")
      .insert({ exam_id: examId, user_id: userId, randomized_order: {} });
    expect(error?.code).toBe("23505"); // unique_violation
  });

  it("auto-submits via the anti-cheat leave endpoint", async () => {
    const { admin, teacher, courseId, examId } = await createPublishedExam();
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);
    await grantCourseAccess(userId, courseId);

    const startRes = await client.post<StartData>(`/api/exams/${examId}/start`);
    const attemptId = startRes.json!.data!.attempt_id;

    const leaveRes = await client.post(`/api/exam-attempts/${attemptId}/leave`, { responses: [] });
    expect(leaveRes.status).toBe(200);

    const adminClient = createAdminClient();
    const { data: attempt } = await adminClient
      .from("student_exam_attempts")
      .select("status, auto_submitted, score_percent")
      .eq("id", attemptId)
      .single();
    expect(attempt?.status).toBe("submitted");
    expect(attempt?.auto_submitted).toBe(true);
    expect(attempt?.score_percent).toBe(0);
  });
});
