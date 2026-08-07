import { describe, it, expect, afterAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserRegistry } from "./cleanup";
import { createLoggedInAdmin, createLoggedInTeacher, createLoggedInStudent, createPublishedLesson } from "./phase2-fixtures";
import { createLoggedInParent } from "./phase6-fixtures";
import { TEST_BASE_URL } from "./test-env";

describe("Admin users list/detail (Phase 11)", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("rejects a non-staff caller, allows admin, and returns the caller's own roles", async () => {
    const admin = await createLoggedInAdmin();
    const student = await createLoggedInStudent();
    registry.track(admin.userId);
    registry.track(student.userId);

    const denied = await student.client.get("/api/admin/users");
    expect(denied.status).toBe(403);

    const allowed = await admin.client.get<Array<{ id: string; roles: string[] }>>("/api/admin/users");
    expect(allowed.status).toBe(200);
    const adminRow = allowed.json?.data?.find((u) => u.id === admin.userId);
    expect(adminRow?.roles).toContain("admin");

    const detail = await admin.client.get<{ id: string; email: string }>(`/api/admin/users/${student.userId}`);
    expect(detail.status).toBe(200);
    expect(detail.json?.data?.id).toBe(student.userId);
  });

  it("404s for a non-existent user id", async () => {
    const admin = await createLoggedInAdmin();
    registry.track(admin.userId);

    const res = await admin.client.get("/api/admin/users/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });
});

describe("Teacher self-service report (Phase 11)", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("returns own courses with analytics but never revenue_cents (Section 6 - teachers can't see payment data)", async () => {
    const { admin, teacher, courseId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);

    // course_teachers is never auto-populated by course creation (created_by
    // != team membership - see goglish_conventions) - a teacher must be
    // explicitly assigned before their report will show that course.
    await admin.client.post(`/api/courses/${courseId}/teachers`, { teacher_id: teacher.teacherId });

    const res = await teacher.client.get<{ courses: Array<Record<string, unknown>> }>("/api/teachers/me/report");
    expect(res.status).toBe(200);
    expect(res.json?.data?.courses.length).toBeGreaterThan(0);
    for (const course of res.json!.data!.courses) {
      expect(course).not.toHaveProperty("revenue_cents");
      expect(course).toHaveProperty("avg_completion_percent");
      expect(course).toHaveProperty("avg_quiz_score_percent");
    }
  });

  it("404s for a caller with no teacher account", async () => {
    const student = await createLoggedInStudent();
    registry.track(student.userId);

    const res = await student.client.get("/api/teachers/me/report");
    expect(res.status).toBe(404);
  });
});

describe("Admin pending-lessons queue (Phase 11)", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("lists a submitted lesson with course/module context and lets admin publish it", async () => {
    const adminA = await createLoggedInAdmin();
    const teacher = await createLoggedInTeacher();
    registry.track(adminA.userId);
    registry.track(teacher.userId);

    const { json: gradesJson } = await adminA.client.get<Array<{ id: string; slug: string }>>("/api/grades");
    const gradeId = gradesJson!.data!.find((g) => g.slug === "grade1")!.id;
    const { json: subjectJson } = await adminA.client.post<{ id: string }>("/api/subjects", {
      grade_id: gradeId,
      name: "مادة",
      slug: `subject-${Date.now()}`,
    });
    const { json: courseJson } = await teacher.client.post<{ id: string }>("/api/courses", {
      subject_id: subjectJson!.data!.id,
      title: "كورس",
      slug: `course-${Date.now()}`,
    });
    const courseId = courseJson!.data!.id;
    const { json: moduleJson } = await teacher.client.post<{ id: string }>(`/api/courses/${courseId}/modules`, {
      title: "وحدة",
      order_index: 0,
    });
    const { json: lessonJson } = await teacher.client.post<{ id: string }>(
      `/api/modules/${moduleJson!.data!.id}/lessons`,
      { title: "درس في انتظار المراجعة", order_index: 0 },
    );
    const lessonId = lessonJson!.data!.id;
    await teacher.client.post(`/api/lessons/${lessonId}/submit`);

    const queue = await adminA.client.get<Array<{ id: string; title: string }>>("/api/admin/content/pending-lessons");
    expect(queue.status).toBe(200);
    expect(queue.json?.data?.some((l) => l.id === lessonId)).toBe(true);

    const review = await adminA.client.post<{ status: string }>(`/api/lessons/${lessonId}/review`, {
      decision: "published",
    });
    expect(review.status).toBe(200);
    expect(review.json?.data?.status).toBe("published");

    const queueAfter = await adminA.client.get<Array<{ id: string }>>("/api/admin/content/pending-lessons");
    expect(queueAfter.json?.data?.some((l) => l.id === lessonId)).toBe(false);
  });
});

describe("Courses teacher_id filter (Phase 10)", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("returns only courses assigned to that teacher, not another teacher's", async () => {
    const { admin, teacher, courseId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const otherTeacher = await createLoggedInTeacher();
    registry.track(otherTeacher.userId);

    // course_teachers is never auto-populated by course creation - assign
    // explicitly (see goglish_conventions: created_by != team membership).
    await admin.client.post(`/api/courses/${courseId}/teachers`, { teacher_id: teacher.teacherId });

    const res = await admin.client.get<Array<{ id: string }>>(`/api/courses?teacher_id=${teacher.teacherId}`);
    expect(res.status).toBe(200);
    expect(res.json?.data?.some((c) => c.id === courseId)).toBe(true);

    const resOther = await admin.client.get<Array<{ id: string }>>(`/api/courses?teacher_id=${otherTeacher.teacherId}`);
    expect(resOther.json?.data?.some((c) => c.id === courseId)).toBe(false);
  });
});

describe("Parent-links assigns the parent role (Phase 12 regression)", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("POST /api/parent-links grants the parent role via role_user, not just the link row", async () => {
    const admin = await createLoggedInAdmin();
    const student = await createLoggedInStudent();
    const parentCandidate = await createLoggedInStudent();
    registry.track(admin.userId);
    registry.track(student.userId);
    registry.track(parentCandidate.userId);

    const res = await admin.client.post("/api/parent-links", {
      parent_user_id: parentCandidate.userId,
      student_user_id: student.userId,
    });
    expect(res.status).toBe(201);

    const supabase = createAdminClient();
    const { data: roles } = await supabase
      .from("role_user")
      .select("roles(name)")
      .eq("user_id", parentCandidate.userId);
    const roleNames = (roles ?? []).map((r) => (r.roles as unknown as { name: string })?.name);
    expect(roleNames).toContain("parent");
  });
});

describe("Parent child notifications (Phase 11)", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("lets a linked parent see the child's notifications, blocks an unlinked caller", async () => {
    const student = await createLoggedInStudent();
    const parent = await createLoggedInParent();
    const stranger = await createLoggedInParent();
    registry.track(student.userId);
    registry.track(parent.userId);
    registry.track(stranger.userId);

    const supabase = createAdminClient();
    await supabase
      .from("parent_student_links")
      .insert({ parent_user_id: parent.userId, student_user_id: student.userId, status: "approved" });
    await supabase.from("notifications").insert({
      user_id: student.userId,
      type: "test",
      title: "إشعار تجريبي",
      body: "محتوى الإشعار",
    });

    const allowed = await parent.client.get<Array<{ title: string }>>(`/api/parent/children/${student.userId}/notifications`);
    expect(allowed.status).toBe(200);
    expect(allowed.json?.data?.some((n) => n.title === "إشعار تجريبي")).toBe(true);

    const denied = await stranger.client.get(`/api/parent/children/${student.userId}/notifications`);
    expect(denied.status).toBe(403);
  });
});

describe("CSRF Origin check (Phase 12 - proxy.ts)", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("rejects a cross-site Origin on a state-changing request", async () => {
    const student = await createLoggedInStudent();
    registry.track(student.userId);

    const crossSite = await fetch(`${TEST_BASE_URL}/api/wishlist/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://evil.example.com" },
      body: JSON.stringify({ course_id: "00000000-0000-0000-0000-000000000000" }),
    });
    expect(crossSite.status).toBe(403);
  });

  it("does not block a request with no Origin header at all (fail-open, matches every other test's http-client calls)", async () => {
    // "Origin" is a forbidden header name per the Fetch spec - fetch() silently
    // drops attempts to set it manually, so a same-origin browser request
    // can't be faithfully simulated here. Every other test in this suite
    // already exercises exactly this "no Origin header" path via
    // tests/http-client.ts's plain fetch calls (all 129+ of them), which is
    // this check's real-world fail-open case (non-browser/legit tooling).
    const res = await fetch(`${TEST_BASE_URL}/api/wishlist/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: "00000000-0000-0000-0000-000000000000" }),
    });
    expect(res.status).not.toBe(403);
  });
});

describe("Device single-active-stream (Phase 12 - Section 22)", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("blocks starting a second lesson's stream from the same device while the first is still active", async () => {
    const { admin, teacher, courseId, lessonId: lessonAId } = await createPublishedLesson({
      youtube_video_id: "test-video-a",
    });
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const supabase = createAdminClient();
    const { data: moduleRow } = await supabase.from("modules").select("id").eq("course_id", courseId).single();
    const { json: lessonBJson } = await teacher.client.post<{ id: string }>(
      `/api/modules/${moduleRow!.id}/lessons`,
      { title: "درس ب", order_index: 1, youtube_video_id: "test-video-b" },
    );
    const lessonBId = lessonBJson!.data!.id;
    await teacher.client.post(`/api/lessons/${lessonBId}/submit`);
    await admin.client.post(`/api/lessons/${lessonBId}/review`, { decision: "published" });

    const student = await createLoggedInStudent();
    registry.track(student.userId);
    await supabase.from("course_entitlements").insert({ user_id: student.userId, course_id: courseId, source: "purchase" });

    const first = await student.client.get<{ provider: string }>(`/api/lessons/${lessonAId}/playback`);
    expect(first.status).toBe(200);
    expect(first.json?.data?.provider).toBe("youtube");

    const second = await student.client.get(`/api/lessons/${lessonBId}/playback`);
    expect(second.status).toBe(409);

    // Re-requesting the SAME lesson (e.g. a page refresh) still succeeds.
    const refresh = await student.client.get<{ provider: string }>(`/api/lessons/${lessonAId}/playback`);
    expect(refresh.status).toBe(200);
  });
});
