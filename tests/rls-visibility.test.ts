import { describe, it, expect, afterAll } from "vitest";
import { createTestClient } from "./http-client";
import { createUserRegistry } from "./cleanup";
import { createLoggedInAdmin, createLoggedInTeacher } from "./phase2-fixtures";

function uniqueSlug(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

describe("Draft content RLS visibility", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("hides a teacher's draft course from unrelated teachers/anon, but not from admin", async () => {
    const admin = await createLoggedInAdmin();
    const ownerTeacher = await createLoggedInTeacher();
    const otherTeacher = await createLoggedInTeacher();
    registry.track(admin.userId);
    registry.track(ownerTeacher.userId);
    registry.track(otherTeacher.userId);
    const anon = createTestClient();

    const { json: gradesJson } = await admin.client.get<Array<{ id: string; slug: string }>>(
      "/api/grades",
    );
    const gradeId = gradesJson!.data!.find((g) => g.slug === "grade1")!.id;
    const { json: subjectJson } = await admin.client.post<{ id: string }>("/api/subjects", {
      grade_id: gradeId,
      name: "مادة",
      slug: uniqueSlug("subject"),
    });
    const subjectId = subjectJson!.data!.id;

    const { json: courseJson } = await ownerTeacher.client.post<{ id: string }>("/api/courses", {
      subject_id: subjectId,
      title: "كورس خاص",
      slug: uniqueSlug("course"),
    });
    const courseId = courseJson!.data!.id;

    const ownerView = await ownerTeacher.client.get(`/api/courses/${courseId}`);
    expect(ownerView.status).toBe(200);

    const otherView = await otherTeacher.client.get(`/api/courses/${courseId}`);
    expect(otherView.status).toBe(404);

    const anonView = await anon.get(`/api/courses/${courseId}`);
    expect(anonView.status).toBe(404);

    const adminView = await admin.client.get(`/api/courses/${courseId}`);
    expect(adminView.status).toBe(200);
  });

  it("lets a course-team teacher (not the creator) manage its modules", async () => {
    const admin = await createLoggedInAdmin();
    const owner = await createLoggedInTeacher();
    const teammate = await createLoggedInTeacher();
    registry.track(admin.userId);
    registry.track(owner.userId);
    registry.track(teammate.userId);

    const { json: gradesJson } = await admin.client.get<Array<{ id: string; slug: string }>>(
      "/api/grades",
    );
    const gradeId = gradesJson!.data!.find((g) => g.slug === "grade1")!.id;
    const { json: subjectJson } = await admin.client.post<{ id: string }>("/api/subjects", {
      grade_id: gradeId,
      name: "مادة",
      slug: uniqueSlug("subject"),
    });
    const subjectId = subjectJson!.data!.id;

    const { json: courseJson } = await owner.client.post<{ id: string }>("/api/courses", {
      subject_id: subjectId,
      title: "كورس فريق",
      slug: uniqueSlug("course"),
    });
    const courseId = courseJson!.data!.id;

    // Before joining the team, teammate cannot add modules.
    const beforeJoin = await teammate.client.post(`/api/courses/${courseId}/modules`, {
      title: "وحدة",
      order_index: 0,
    });
    expect(beforeJoin.status).toBe(403);

    const assign = await admin.client.post(`/api/courses/${courseId}/teachers`, {
      teacher_id: teammate.teacherId,
    });
    expect(assign.status).toBe(201);

    const afterJoin = await teammate.client.post(`/api/courses/${courseId}/modules`, {
      title: "وحدة",
      order_index: 0,
    });
    expect(afterJoin.status).toBe(201);
  });
});
