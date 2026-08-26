import { describe, it, expect, afterAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserRegistry } from "./cleanup";
import { uniqueEmail, buildNationalId } from "./fixtures";
import { repairIncompleteSelfRegistrations } from "@/lib/services/admin-user-management.service";

/** Simulates the stuck state directly (a confirmed auth user whose
 * user_metadata carries the original self-service signup fields, but whose
 * profile never got completed) rather than the real PKCE-failure trigger -
 * the repair only cares about the resulting state
 * (self_registration_completed_at IS NULL + role_type in metadata), not how
 * it got there. */
async function createStuckSelfRegisteredUser(overrides: Record<string, unknown> = {}) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: uniqueEmail(),
    password: "Str0ngPass!",
    email_confirm: true,
    user_metadata: {
      role_type: "student",
      first_name: "طالب",
      last_name: "عالق",
      phone: "01000000000",
      national_id: buildNationalId(16),
      grade: "grade1",
      ...overrides,
    },
  });
  if (error || !data.user) throw error ?? new Error("failed to create test user");
  return data.user;
}

describe("repairIncompleteSelfRegistrations", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("completes a profile stuck on the handle_new_user() stub", async () => {
    const user = await createStuckSelfRegisteredUser();
    registry.track(user.id);

    const admin = createAdminClient();
    const before = await admin.from("profiles").select("phone, grade, self_registration_completed_at").eq("id", user.id).single();
    expect(before.data?.self_registration_completed_at).toBeNull();
    expect(before.data?.phone).toBeNull();

    const result = await repairIncompleteSelfRegistrations(user.id);
    expect(result.candidates).toBeGreaterThanOrEqual(1);
    expect(result.repaired).toBeGreaterThanOrEqual(1);
    expect(result.failed.find((f) => f.id === user.id)).toBeUndefined();

    const after = await admin
      .from("profiles")
      .select("phone, grade, self_registration_completed_at")
      .eq("id", user.id)
      .single();
    expect(after.data?.phone).toBe("01000000000");
    expect(after.data?.grade).toBe("grade1");
    expect(after.data?.self_registration_completed_at).not.toBeNull();

    const { data: roleRows } = await admin.from("role_user").select("roles(name)").eq("user_id", user.id);
    const roleNames = (roleRows ?? []).map((r) => (r.roles as unknown as { name: string } | null)?.name);
    expect(roleNames).toContain("student");
  });

  it("is idempotent - running it twice doesn't re-process an already-completed user", async () => {
    const user = await createStuckSelfRegisteredUser();
    registry.track(user.id);

    const first = await repairIncompleteSelfRegistrations(user.id);
    expect(first.repaired).toBeGreaterThanOrEqual(1);

    const admin = createAdminClient();
    const { data: profileAfterFirst } = await admin
      .from("profiles")
      .select("self_registration_completed_at")
      .eq("id", user.id)
      .single();
    const completedAt = profileAfterFirst?.self_registration_completed_at;

    const second = await repairIncompleteSelfRegistrations(user.id);
    expect(second.candidates).toBe(0);

    const { data: profileAfterSecond } = await admin
      .from("profiles")
      .select("self_registration_completed_at")
      .eq("id", user.id)
      .single();
    // Unchanged - the second run never touched this user since it's no
    // longer a candidate (self_registration_completed_at is already set).
    expect(profileAfterSecond?.self_registration_completed_at).toBe(completedAt);
  });

  it("reports a bad national ID as a failure instead of silently skipping it", async () => {
    const user = await createStuckSelfRegisteredUser({ national_id: "not-a-real-id" });
    registry.track(user.id);

    const result = await repairIncompleteSelfRegistrations(user.id);
    const failure = result.failed.find((f) => f.id === user.id);
    expect(failure).toBeDefined();

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("self_registration_completed_at")
      .eq("id", user.id)
      .single();
    expect(profile?.self_registration_completed_at).toBeNull();
  });
});
