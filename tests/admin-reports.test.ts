import { describe, it, expect, afterAll } from "vitest";
import { createUserRegistry } from "./cleanup";
import { createLoggedInAdmin, createLoggedInStudent, grantCourseAccess } from "./phase2-fixtures";
import { createPublishedQuiz } from "./phase3-fixtures";
import { createPricedCourse, providerPaymentIdFromCheckoutUrl, simulateProviderWebhook } from "./phase4-fixtures";
import { passQuiz } from "./gamification-fixtures";

describe("Admin dashboard + reports", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("dashboard is admin-gated and returns summary counts", async () => {
    const { client: adminClient, userId: adminId } = await createLoggedInAdmin();
    registry.track(adminId);
    const { client: student, userId: studentId } = await createLoggedInStudent();
    registry.track(studentId);

    const denied = await student.get("/api/admin/dashboard");
    expect(denied.status).toBe(403);

    const { status, json } = await adminClient.get<{ students_count: number; courses_count: number }>(
      "/api/admin/dashboard",
    );
    expect(status).toBe(200);
    expect(json?.data?.students_count).toBeGreaterThanOrEqual(1);
    expect(typeof json?.data?.courses_count).toBe("number");
  });

  it("financial report reflects a real completed purchase", async () => {
    const { client: adminClient, userId: adminId } = await createLoggedInAdmin();
    registry.track(adminId);
    const { admin, teacher, courseId } = await createPricedCourse(10000);
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client: student, userId: studentId } = await createLoggedInStudent();
    registry.track(studentId);

    const { json: orderJson } = await student.post<{ id: string; total_cents: number }>("/api/orders", {
      item_type: "course",
      item_id: courseId,
    });
    const { json: payJson } = await student.post<{ checkout_url: string }>(
      `/api/orders/${orderJson!.data!.id}/pay`,
      { provider: "paymob" },
    );
    const providerPaymentId = providerPaymentIdFromCheckoutUrl(payJson!.data!.checkout_url);
    await simulateProviderWebhook("paymob", providerPaymentId, "success");

    const { status, json } = await adminClient.get<{ revenue_cents: number; orders_completed: number }>(
      "/api/admin/reports/financial",
    );
    expect(status).toBe(200);
    expect(json?.data?.revenue_cents).toBeGreaterThanOrEqual(orderJson!.data!.total_cents);
    expect(json?.data?.orders_completed).toBeGreaterThanOrEqual(1);
  });

  it("student report includes gamification + quiz results after a real quiz pass", async () => {
    const { client: adminClient, userId: adminId } = await createLoggedInAdmin();
    registry.track(adminId);
    const { admin, teacher, courseId, quizId } = await createPublishedQuiz();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client: student, userId: studentId } = await createLoggedInStudent();
    registry.track(studentId);
    await grantCourseAccess(studentId, courseId);

    await passQuiz(student, quizId);

    const { status, json } = await adminClient.get<{
      gamification: { xp_total: number };
      quiz_scores: Array<{ score_percent: number }>;
    }>(`/api/admin/reports/students/${studentId}`);
    expect(status).toBe(200);
    expect(json?.data?.gamification.xp_total).toBeGreaterThan(0);
    expect(json?.data?.quiz_scores.length).toBeGreaterThanOrEqual(1);
  });

  it("teacher report lists their courses with a student count", async () => {
    const { client: adminClient, userId: adminId } = await createLoggedInAdmin();
    registry.track(adminId);
    const { admin, teacher, courseId } = await createPricedCourse(5000);
    registry.track(admin.userId);
    registry.track(teacher.userId);
    // createPricedCourse only sets courses.created_by - the teacher report
    // reads course_teachers (Section 6's teaching-team assignment), so the
    // teacher has to be assigned to the course explicitly.
    await adminClient.post(`/api/courses/${courseId}/teachers`, { teacher_id: teacher.teacherId });

    const { status, json } = await adminClient.get<{ courses: Array<{ course_id: string }> }>(
      `/api/admin/reports/teachers/${teacher.teacherId}`,
    );
    expect(status).toBe(200);
    expect(json?.data?.courses.some((c) => c.course_id === courseId)).toBe(true);
  });
});
