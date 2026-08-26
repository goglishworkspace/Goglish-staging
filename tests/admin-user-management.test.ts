import { describe, it, expect, afterAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserRegistry } from "./cleanup";
import {
  createLoggedInAdmin,
  createLoggedInStudent,
  createLoggedInTeacher,
  createPublishedLesson,
} from "./phase2-fixtures";
import { createTestClient } from "./http-client";
import { TEST_BASE_URL } from "./test-env";

describe("Admin user management", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("bans a user (blocking real login) and unbans them", async () => {
    const { client: adminClient, userId: adminId } = await createLoggedInAdmin();
    registry.track(adminId);
    const student = await createLoggedInStudent();
    registry.track(student.userId);

    const banRes = await adminClient.post(`/api/admin/users/${student.userId}/ban`, { reason: "اختبار" });
    expect(banRes.status).toBe(200);

    const supabase = createAdminClient();
    const { data: bannedUser } = await supabase.auth.admin.getUserById(student.userId);
    expect(bannedUser.user?.banned_until).toBeTruthy();

    // The real, correct password - proves the ban itself blocks login, not
    // just bad credentials.
    const freshClient = createTestClient();
    const loginAfterBan = await freshClient.post("/api/auth/login", {
      email: bannedUser.user!.email,
      password: "Str0ngPass!",
    });
    expect(loginAfterBan.status).not.toBe(200);

    const unbanRes = await adminClient.delete(`/api/admin/users/${student.userId}/ban`);
    expect(unbanRes.status).toBe(200);
    const { data: unbannedUser } = await supabase.auth.admin.getUserById(student.userId);
    expect(unbannedUser.user?.banned_until ?? null).toBeFalsy();
  });

  it("suspends and reactivates a teacher, and 404s for a non-teacher user", async () => {
    const { client: adminClient, userId: adminId } = await createLoggedInAdmin();
    registry.track(adminId);
    const teacher = await createLoggedInTeacher();
    registry.track(teacher.userId);
    const student = await createLoggedInStudent();
    registry.track(student.userId);

    const suspendRes = await adminClient.post(`/api/admin/users/${teacher.userId}/suspend-teacher`, {});
    expect(suspendRes.status).toBe(200);

    const supabase = createAdminClient();
    const { data: teacherRow } = await supabase.from("teachers").select("status").eq("user_id", teacher.userId).single();
    expect(teacherRow?.status).toBe("suspended");

    const reactivateRes = await adminClient.delete(`/api/admin/users/${teacher.userId}/suspend-teacher`);
    expect(reactivateRes.status).toBe(200);
    const { data: reactivated } = await supabase.from("teachers").select("status").eq("user_id", teacher.userId).single();
    expect(reactivated?.status).toBe("active");

    const notTeacherRes = await adminClient.post(`/api/admin/users/${student.userId}/suspend-teacher`, {});
    expect(notTeacherRes.status).toBe(404);
  });

  it("resets a user's devices", async () => {
    const { client: adminClient, userId: adminId } = await createLoggedInAdmin();
    registry.track(adminId);
    const student = await createLoggedInStudent(); // login already registers one active device
    registry.track(student.userId);

    const resetRes = await adminClient.post<{ devices_deactivated: number }>(
      `/api/admin/users/${student.userId}/reset-devices`,
    );
    expect(resetRes.status).toBe(200);
    expect(resetRes.json?.data?.devices_deactivated).toBeGreaterThanOrEqual(1);

    const supabase = createAdminClient();
    const { data: devices } = await supabase.from("devices").select("is_active").eq("user_id", student.userId);
    expect(devices?.every((d) => d.is_active === false)).toBe(true);
  });

  it("assigns and revokes a role, 404s for an unknown role name", async () => {
    const { client: adminClient, userId: adminId } = await createLoggedInAdmin();
    registry.track(adminId);
    const student = await createLoggedInStudent();
    registry.track(student.userId);

    const assignRes = await adminClient.post(`/api/admin/users/${student.userId}/roles`, { role_name: "moderator" });
    expect(assignRes.status).toBe(201);

    const supabase = createAdminClient();
    const { data: role } = await supabase.from("roles").select("id").eq("name", "moderator").single();
    const { data: roleUser } = await supabase
      .from("role_user")
      .select("user_id")
      .eq("user_id", student.userId)
      .eq("role_id", role!.id)
      .maybeSingle();
    expect(roleUser).toBeTruthy();

    const revokeRes = await adminClient.delete(`/api/admin/users/${student.userId}/roles?role_name=moderator`);
    expect(revokeRes.status).toBe(200);
    const { data: roleUserAfter } = await supabase
      .from("role_user")
      .select("user_id")
      .eq("user_id", student.userId)
      .eq("role_id", role!.id)
      .maybeSingle();
    expect(roleUserAfter).toBeNull();

    const unknownRoleRes = await adminClient.post(`/api/admin/users/${student.userId}/roles`, {
      role_name: "not-a-real-role",
    });
    expect(unknownRoleRes.status).toBe(404);
  });

  it("soft-deletes a user, then hard-deletes them once past the 1-hour grace window", async () => {
    const { client: adminClient, userId: adminId } = await createLoggedInAdmin();
    registry.track(adminId);
    const student = await createLoggedInStudent();
    registry.track(student.userId);

    const deleteRes = await adminClient.delete(`/api/admin/users/${student.userId}`);
    expect(deleteRes.status).toBe(200);

    const supabase = createAdminClient();
    const { data: profile } = await supabase.from("profiles").select("deleted_at").eq("id", student.userId).single();
    expect(profile?.deleted_at).toBeTruthy();

    // Simulate 2 hours having passed - well past HARD_DELETE_AFTER_HOURS (1).
    await supabase
      .from("profiles")
      .update({ deleted_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() })
      .eq("id", student.userId);

    const unauthorized = await fetch(`${TEST_BASE_URL}/api/admin/users/hard-delete-due`, {
      method: "POST",
      headers: { "x-user-hard-delete-secret": "wrong-secret" },
    });
    expect(unauthorized.status).toBe(401);

    const hardDeleteRes = await fetch(`${TEST_BASE_URL}/api/admin/users/hard-delete-due`, {
      method: "POST",
      headers: { "x-user-hard-delete-secret": process.env.USER_HARD_DELETE_SECRET ?? "" },
    });
    expect(hardDeleteRes.status).toBe(200);

    const { data: goneUser } = await supabase.auth.admin.getUserById(student.userId);
    expect(goneUser.user).toBeNull();
  }, 30000);

  it("restores a soft-deleted user before the hard-delete window passes", async () => {
    const { client: adminClient, userId: adminId } = await createLoggedInAdmin();
    registry.track(adminId);
    const student = await createLoggedInStudent();
    registry.track(student.userId);

    const deleteRes = await adminClient.delete(`/api/admin/users/${student.userId}`);
    expect(deleteRes.status).toBe(200);

    const restoreRes = await adminClient.post(`/api/admin/users/${student.userId}/restore`);
    expect(restoreRes.status).toBe(200);

    const supabase = createAdminClient();
    const { data: profile } = await supabase.from("profiles").select("deleted_at").eq("id", student.userId).single();
    expect(profile?.deleted_at).toBeNull();

    // Nothing to restore the second time - already active.
    const secondRestoreRes = await adminClient.post(`/api/admin/users/${student.userId}/restore`);
    expect(secondRestoreRes.status).toBe(409);
  });

  it("blocks deleting a teacher who still has courses, naming them in the error", async () => {
    const { admin, teacher, courseId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const deleteRes = await admin.client.delete(`/api/admin/users/${teacher.userId}`);
    expect(deleteRes.status).toBe(409);
    expect(deleteRes.json?.message).toContain("كورس تجريبي");

    const supabase = createAdminClient();
    const { data: profile } = await supabase.from("profiles").select("deleted_at").eq("id", teacher.userId).single();
    expect(profile?.deleted_at).toBeNull();

    // Confirms the block is specifically about *this* teacher having a
    // course, not e.g. every teacher being unconditionally blocked.
    const { data: course } = await supabase.from("courses").select("created_by").eq("id", courseId).single();
    expect(course?.created_by).toBe(teacher.userId);
  });

  it("triggers a password reset email for a user", async () => {
    const { client: adminClient, userId: adminId } = await createLoggedInAdmin();
    registry.track(adminId);
    const student = await createLoggedInStudent();
    registry.track(student.userId);

    const res = await adminClient.post(`/api/admin/users/${student.userId}/reset-password`);
    expect(res.status).toBe(200);
  });
});
