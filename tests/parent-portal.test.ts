import { describe, it, expect, afterAll } from "vitest";
import { createUserRegistry } from "./cleanup";
import { createLoggedInStudent, grantCourseAccess } from "./phase2-fixtures";
import { createPublishedQuiz } from "./phase3-fixtures";
import { passQuiz } from "./gamification-fixtures";
import { createLoggedInParent, linkParentToStudent } from "./phase6-fixtures";

describe("Parent Portal", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("blocks a parent from viewing a student they aren't linked to", async () => {
    const { client: parent, userId: parentId } = await createLoggedInParent();
    registry.track(parentId);
    const { userId: studentId } = await createLoggedInStudent();
    registry.track(studentId);

    const res = await parent.get(`/api/parent/children/${studentId}/overview`);
    expect(res.status).toBe(403);
  });

  it("shows a linked parent their child's progress, grades, and XP - and lists them under /children", async () => {
    const { admin, teacher, courseId, quizId } = await createPublishedQuiz();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client: student, userId: studentId } = await createLoggedInStudent();
    registry.track(studentId);
    await grantCourseAccess(studentId, courseId);
    const { client: parent, userId: parentId } = await createLoggedInParent();
    registry.track(parentId);

    await linkParentToStudent(parentId, studentId);
    await passQuiz(student, quizId);

    const childrenRes = await parent.get<Array<{ student_id: string }>>("/api/parent/children");
    expect(childrenRes.status).toBe(200);
    expect(childrenRes.json?.data?.some((c) => c.student_id === studentId)).toBe(true);

    const overviewRes = await parent.get<{
      gamification: { xp_total: number };
      quiz_results: Array<{ score_percent: number }>;
    }>(`/api/parent/children/${studentId}/overview`);
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.json?.data?.gamification.xp_total).toBeGreaterThan(0);
    expect(overviewRes.json?.data?.quiz_results.length).toBeGreaterThanOrEqual(1);
  });

  it("still blocks the parent from a different, unlinked student after they're linked to one", async () => {
    const { client: parent, userId: parentId } = await createLoggedInParent();
    registry.track(parentId);
    const { userId: linkedStudentId } = await createLoggedInStudent();
    registry.track(linkedStudentId);
    const { userId: otherStudentId } = await createLoggedInStudent();
    registry.track(otherStudentId);

    await linkParentToStudent(parentId, linkedStudentId);

    const res = await parent.get(`/api/parent/children/${otherStudentId}/overview`);
    expect(res.status).toBe(403);
  });
});
