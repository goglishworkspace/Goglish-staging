import { describe, it, expect, afterAll } from "vitest";
import { createUserRegistry } from "./cleanup";
import { createLoggedInAdmin, createLoggedInStudent, createPublishedLesson } from "./phase2-fixtures";
import { createLoggedInModerator } from "./phase6-fixtures";

describe("Audit logs", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("is admin/staff-gated", async () => {
    const { client } = await createLoggedInStudent();
    const res = await client.get("/api/admin/audit-logs");
    expect(res.status).toBe(403);
  });

  it("records a login event", async () => {
    const { client: adminClient, userId: adminId } = await createLoggedInAdmin();
    registry.track(adminId);

    // createLoggedInAdmin already performed a login as part of setup.
    const { status, json } = await adminClient.get<{ logs: Array<{ action: string; actor_user_id: string }> }>(
      `/api/admin/audit-logs?actor_user_id=${adminId}&action=user.login`,
    );
    expect(status).toBe(200);
    expect(json?.data?.logs?.some((row) => row.actor_user_id === adminId)).toBe(true);
  });

  it("records comment moderation decisions (Section 25 explicit requirement)", async () => {
    const { admin, teacher, lessonId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client: student, userId: studentId } = await createLoggedInStudent();
    registry.track(studentId);
    const { client: moderator, userId: moderatorId } = await createLoggedInModerator();
    registry.track(moderatorId);
    const { client: adminClient, userId: adminId } = await createLoggedInAdmin();
    registry.track(adminId);

    const { json: commentJson } = await student.post<{ id: string }>(`/api/lessons/${lessonId}/comments`, {
      content: "تعليق للمراجعة",
    });
    await moderator.post(`/api/comments/${commentJson!.data!.id}/review`, { decision: "approved" });

    const { status, json } = await adminClient.get<{ logs: Array<{ action: string; target_id: string }> }>(
      `/api/admin/audit-logs?action=comment.approved`,
    );
    expect(status).toBe(200);
    expect(json?.data?.logs?.some((row) => row.target_id === commentJson!.data!.id)).toBe(true);
  });

  it("records a user ban", async () => {
    const { client: adminClient, userId: adminId } = await createLoggedInAdmin();
    registry.track(adminId);
    const student = await createLoggedInStudent();
    registry.track(student.userId);

    await adminClient.post(`/api/admin/users/${student.userId}/ban`, {});

    const { json } = await adminClient.get<{ logs: Array<{ action: string; target_id: string }> }>(
      `/api/admin/audit-logs?action=user.banned`,
    );
    expect(json?.data?.logs?.some((row) => row.target_id === student.userId)).toBe(true);
  });
});
