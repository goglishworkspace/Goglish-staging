import { describe, it, expect, afterAll } from "vitest";
import { createUserRegistry } from "./cleanup";
import { createLoggedInAdmin, createLoggedInTeacher } from "./phase2-fixtures";

function uniqueSlug(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

describe("Course/lesson Draft -> Published workflow", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("teacher drafts a course, submits it, admin approves it, and it becomes visible", async () => {
    const admin = await createLoggedInAdmin();
    const teacher = await createLoggedInTeacher();
    registry.track(admin.userId);
    registry.track(teacher.userId);

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

    const createRes = await teacher.client.post<{ id: string; status: string }>("/api/courses", {
      subject_id: subjectId,
      title: "كورس الرياضيات",
      slug: uniqueSlug("course"),
    });
    expect(createRes.status).toBe(201);
    expect(createRes.json?.data?.status).toBe("draft");
    const courseId = createRes.json!.data!.id;

    const submitRes = await teacher.client.post(`/api/courses/${courseId}/submit`);
    expect(submitRes.status).toBe(200);

    const reviewRes = await admin.client.post<{ status: string }>(`/api/courses/${courseId}/review`, {
      decision: "published",
    });
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.json?.data?.status).toBe("published");

    const publicView = await admin.client.get<{ status: string }>(`/api/courses/${courseId}`);
    expect(publicView.json?.data?.status).toBe("published");
  });

  it("rejects with a reason, and the teacher can resubmit after fixing it", async () => {
    const admin = await createLoggedInAdmin();
    const teacher = await createLoggedInTeacher();
    registry.track(admin.userId);
    registry.track(teacher.userId);

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

    const { json: courseJson } = await teacher.client.post<{ id: string }>("/api/courses", {
      subject_id: subjectId,
      title: "كورس ناقص",
      slug: uniqueSlug("course"),
    });
    const courseId = courseJson!.data!.id;

    await teacher.client.post(`/api/courses/${courseId}/submit`);

    const rejectRes = await admin.client.post<{ status: string; rejection_reason: string }>(
      `/api/courses/${courseId}/review`,
      { decision: "rejected", rejection_reason: "العنوان مش واضح" },
    );
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.json?.data?.status).toBe("rejected");
    expect(rejectRes.json?.data?.rejection_reason).toBe("العنوان مش واضح");

    // Teacher can still edit/resubmit a rejected course.
    const resubmit = await teacher.client.post(`/api/courses/${courseId}/submit`);
    expect(resubmit.status).toBe(200);
  });

  it("a teacher cannot approve their own course", async () => {
    const admin = await createLoggedInAdmin();
    const teacher = await createLoggedInTeacher();
    registry.track(admin.userId);
    registry.track(teacher.userId);

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

    const { json: courseJson } = await teacher.client.post<{ id: string }>("/api/courses", {
      subject_id: subjectId,
      title: "كورس",
      slug: uniqueSlug("course"),
    });
    const courseId = courseJson!.data!.id;

    const selfReview = await teacher.client.post(`/api/courses/${courseId}/review`, {
      decision: "published",
    });
    expect(selfReview.status).toBe(403);
  });
});
