import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "./audit-log.service";
import { completeSelfRegistrationIfNeeded, type SelfRegistrationMetadata } from "./self-registration.service";

const PERMANENT_BAN_DURATION = "876000h"; // ~100 years, GoTrue has no "forever" literal
const HARD_DELETE_AFTER_HOURS = 1;

// Postgrest sends .in() filters as part of the URL query string - one call
// covering all users at real scale (900+ ids seen in this project already)
// produces a URL long enough to get silently truncated/rejected somewhere in
// front of Postgrest (proxy/URL-length limit), which came back as some
// arbitrary subset of rows missing rather than an error. listUsers() below
// showed real users as if they had no profile at all (null name, deleted_at
// always false) once the id list got large. 200 ids/chunk keeps each request
// comfortably under typical URL-length limits.
const IN_CLAUSE_CHUNK_SIZE = 200;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

async function selectInChunks<T>(
  ids: string[],
  fetchChunk: (idsChunk: string[]) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const results = await Promise.all(chunk(ids, IN_CLAUSE_CHUNK_SIZE).map(fetchChunk));
  const merged: T[] = [];
  for (const { data, error } of results) {
    if (error) throw new Error(error.message);
    if (data) merged.push(...data);
  }
  return merged;
}

export class RoleNotFoundError extends Error {}
export class TeacherNotFoundError extends Error {}

/** Thrown by softDeleteUser() when the target created any course -
 * courses.created_by has no ON DELETE action (unlike every other "who did
 * this" column, see 20260819100000_actor_columns_survive_hard_delete.sql),
 * so hard-deleting them would either fail outright or - if it didn't -
 * orphan a course real students may have paid for. Caught in the API route
 * and surfaced as a 409 with the course titles so the admin can reassign or
 * remove them first. */
export class TeacherHasCoursesError extends Error {
  constructor(public courseTitles: string[]) {
    super(`المدرس ده لسه عنده كورسات، لازم تحولها لمدرس تاني أو تمسحها الأول: ${courseTitles.join("، ")}`);
  }
}

export class UserNotDeletedError extends Error {}

export type AdminUserSummary = {
  id: string;
  user_code: number | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  grade: string | null;
  admin_notes: string | null;
  deleted_at: string | null;
  banned: boolean;
  comment_banned: boolean;
  roles: string[];
  is_teacher: boolean;
  teacher_status: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

export type AdminUserDevice = {
  id: string;
  device_fingerprint: string;
  user_agent: string | null;
  ip_address: string | null;
  is_active: boolean;
  last_active_at: string;
  created_at: string;
};

export type AdminUserLoginEvent = {
  id: string;
  created_at: string;
  ip: string | null;
  user_agent: string | null;
};

export type AdminUserCourse = {
  course_id: string;
  title: string;
  source: string;
  granted_at: string;
};

export type AdminUserDetail = AdminUserSummary & {
  devices: AdminUserDevice[];
  login_history: AdminUserLoginEvent[];
  courses: AdminUserCourse[];
};

/** Only a super_admin can grant/revoke these two roles - a plain admin can
 * manage every other role but not itself or its own tier. */
export const PRIVILEGED_ROLES = ["admin", "super_admin"];

/** Section 15 - "Users Management (كل الأدوار)". No single Postgres table
 * holds every user (email only lives in `auth.users`, which PostgREST can't
 * query directly), so this merges the Auth Admin API's user list with
 * batched profiles/role_user/teachers lookups - same batched-lookup pattern
 * used everywhere else in the codebase for sibling-FK-shaped joins. `q`
 * filters client-side in-process since GoTrue's listUsers has no name/email
 * substring search and the platform's user count is small (Free tier scale). */
export async function listUsers(query?: string): Promise<AdminUserSummary[]> {
  const admin = createAdminClient();
  const { data: authList, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;

  const ids = authList.users.map((u) => u.id);
  const [profiles, roleRows, teacherRows] = await Promise.all([
    selectInChunks(ids, (batch) =>
      admin.from("profiles").select("id, user_code, first_name, last_name, phone, grade, admin_notes, deleted_at, comment_banned").in("id", batch),
    ),
    selectInChunks(ids, (batch) => admin.from("role_user").select("user_id, roles(name)").in("user_id", batch)),
    selectInChunks(ids, (batch) => admin.from("teachers").select("user_id, status").in("user_id", batch)),
  ]);

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const rolesByUser = new Map<string, string[]>();
  for (const row of roleRows) {
    const roleName = (row.roles as unknown as { name: string } | null)?.name;
    if (!roleName) continue;
    const list = rolesByUser.get(row.user_id) ?? [];
    list.push(roleName);
    rolesByUser.set(row.user_id, list);
  }
  const teacherByUser = new Map(teacherRows.map((t) => [t.user_id, t.status as string]));

  let result: AdminUserSummary[] = authList.users.map((u) => {
    const profile = profileById.get(u.id);
    return {
      id: u.id,
      user_code: profile?.user_code ?? null,
      email: u.email ?? "",
      first_name: profile?.first_name ?? null,
      last_name: profile?.last_name ?? null,
      phone: profile?.phone ?? null,
      grade: profile?.grade ?? null,
      admin_notes: profile?.admin_notes ?? null,
      deleted_at: profile?.deleted_at ?? null,
      banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
      comment_banned: profile?.comment_banned ?? false,
      roles: rolesByUser.get(u.id) ?? [],
      is_teacher: teacherByUser.has(u.id),
      teacher_status: teacherByUser.get(u.id) ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    };
  });

  if (query) {
    const q = query.trim().toLowerCase();
    result = result.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q)) ||
        (u.user_code && `gog-${u.user_code}`.includes(q)) ||
        (u.user_code && String(u.user_code).includes(q)) ||
        `${u.first_name ?? ""} ${u.last_name ?? ""}`.toLowerCase().includes(q),
    );
  }

  return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getUserDetail(targetUserId: string): Promise<AdminUserDetail | null> {
  const admin = createAdminClient();
  const { data: userData, error } = await admin.auth.admin.getUserById(targetUserId);
  if (error || !userData.user) return null;
  const u = userData.user;

  const [{ data: profile }, { data: roleRows }, { data: teacher }, { data: devices }, { data: auditLogs }, { data: entitlements }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("user_code, first_name, last_name, phone, grade, admin_notes, deleted_at, comment_banned")
        .eq("id", targetUserId)
        .maybeSingle(),
      admin.from("role_user").select("roles(name)").eq("user_id", targetUserId),
      admin.from("teachers").select("status").eq("user_id", targetUserId).maybeSingle(),
      admin
        .from("devices")
        .select("id, device_fingerprint, user_agent, ip_address, is_active, last_active_at, created_at")
        .eq("user_id", targetUserId)
        .order("last_active_at", { ascending: false }),
      admin
        .from("audit_logs")
        .select("id, created_at, metadata")
        .eq("actor_user_id", targetUserId)
        .eq("action", "user.login")
        .order("created_at", { ascending: false })
        .limit(25),
      admin
        .from("course_entitlements")
        .select("course_id, source, granted_at, courses(title)")
        .eq("user_id", targetUserId)
        .is("revoked_at", null),
    ]);

  const roles = (roleRows ?? [])
    .map((row) => (row.roles as unknown as { name: string } | null)?.name)
    .filter((name): name is string => !!name);

  const deviceList: AdminUserDevice[] = (devices ?? []).map((d) => ({
    id: d.id,
    device_fingerprint: d.device_fingerprint,
    user_agent: d.user_agent,
    ip_address: d.ip_address ? String(d.ip_address) : null,
    is_active: d.is_active,
    last_active_at: d.last_active_at,
    created_at: d.created_at,
  }));

  const loginEvents: AdminUserLoginEvent[] = (auditLogs ?? []).map((log) => {
    const meta = (log.metadata as { ip?: string; user_agent?: string } | null) ?? {};
    return {
      id: log.id,
      created_at: log.created_at,
      ip: meta.ip ?? null,
      user_agent: meta.user_agent ?? null,
    };
  });

  const coursesList: AdminUserCourse[] = (entitlements ?? []).map((ent) => ({
    course_id: ent.course_id,
    title: (ent.courses as unknown as { title: string } | null)?.title ?? "كورس",
    source: ent.source,
    granted_at: ent.granted_at,
  }));

  return {
    id: u.id,
    user_code: profile?.user_code ?? null,
    email: u.email ?? "",
    first_name: profile?.first_name ?? null,
    last_name: profile?.last_name ?? null,
    phone: profile?.phone ?? null,
    grade: profile?.grade ?? null,
    admin_notes: profile?.admin_notes ?? null,
    deleted_at: profile?.deleted_at ?? null,
    banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
    comment_banned: profile?.comment_banned ?? false,
    roles,
    is_teacher: !!teacher,
    teacher_status: teacher?.status ?? null,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    devices: deviceList,
    login_history: loginEvents,
    courses: coursesList,
  };
}

/** Real Supabase Auth ban (Section 15 - "Ban User") - blocks login at the
 * Auth layer itself, not just an application-level flag. */
export async function banUser(actorUserId: string, targetUserId: string, reason: string | null): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(targetUserId, { ban_duration: PERMANENT_BAN_DURATION });
  if (error) throw error;
  await logAudit({ actorUserId, action: "user.banned", targetTable: "auth.users", targetId: targetUserId, metadata: { reason } });
}

export async function unbanUser(actorUserId: string, targetUserId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(targetUserId, { ban_duration: "none" });
  if (error) throw error;
  await logAudit({ actorUserId, action: "user.unbanned", targetTable: "auth.users", targetId: targetUserId });
}

/** Section 15 - "Suspend Teacher": the `teachers.status` column has existed
 * since Phase 2 but nothing wrote to it until now. */
export async function suspendTeacher(actorUserId: string, targetUserId: string, reason: string | null): Promise<void> {
  const admin = createAdminClient();
  const { data: teacher, error } = await admin
    .from("teachers")
    .update({ status: "suspended" })
    .eq("user_id", targetUserId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!teacher) throw new TeacherNotFoundError("مفيش مدرس بالحساب ده");
  await logAudit({ actorUserId, action: "teacher.suspended", targetTable: "teachers", targetId: teacher.id, metadata: { reason } });
}

export async function reactivateTeacher(actorUserId: string, targetUserId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: teacher, error } = await admin
    .from("teachers")
    .update({ status: "active" })
    .eq("user_id", targetUserId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!teacher) throw new TeacherNotFoundError("مفيش مدرس بالحساب ده");
  await logAudit({ actorUserId, action: "teacher.reactivated", targetTable: "teachers", targetId: teacher.id });
}

/** Section 15 - "Reset Password": reuses the exact same
 * `resetPasswordForEmail` flow /api/auth/forgot-password uses, just
 * triggered by an admin on a user's behalf instead of by the user. */
export async function resetUserPassword(actorUserId: string, targetUserId: string, origin: string): Promise<void> {
  const admin = createAdminClient();
  const { data: userData, error: lookupError } = await admin.auth.admin.getUserById(targetUserId);
  if (lookupError || !userData.user?.email) throw lookupError ?? new Error("مفيش إيميل لليوزر ده");

  const { error } = await admin.auth.resetPasswordForEmail(userData.user.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  if (error) throw error;
  await logAudit({ actorUserId, action: "user.password_reset_triggered", targetTable: "auth.users", targetId: targetUserId });
}

/** Section 15 - "Reset Devices": deactivates every device row for the user,
 * freeing up the 2-device limit (Section 5). */
export async function resetUserDevices(actorUserId: string, targetUserId: string): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("devices")
    .update({ is_active: false })
    .eq("user_id", targetUserId)
    .eq("is_active", true)
    .select("id");
  if (error) throw error;
  await logAudit({ actorUserId, action: "user.devices_reset", targetTable: "devices", targetId: targetUserId, metadata: { count: data?.length ?? 0 } });
  return data?.length ?? 0;
}

/** Exclusive reassignment - the admin dashboard's "تعيين دور" action moves a
 * user from whatever role(s) they had to exactly the new one, rather than
 * accumulating roles on top of each other. (Other role grants elsewhere in
 * the app - e.g. linking a parent, self-registering as a teacher - are
 * additive on purpose and don't go through this function.) */
export type AssignRoleTeacherProfile = {
  display_name: string;
  bio?: string;
  photo_url?: string;
  experience_years?: number;
};

export async function assignRole(
  actorUserId: string,
  targetUserId: string,
  roleName: string,
  teacherProfile?: AssignRoleTeacherProfile,
): Promise<void> {
  const admin = createAdminClient();
  const { data: role } = await admin.from("roles").select("id").eq("name", roleName).maybeSingle();
  if (!role) throw new RoleNotFoundError(`الدور "${roleName}" مش موجود`);

  const { error: deleteError } = await admin.from("role_user").delete().eq("user_id", targetUserId);
  if (deleteError) throw deleteError;

  const { error } = await admin.from("role_user").insert({ user_id: targetUserId, role_id: role.id });
  if (error) throw error;

  // The "teacher" role alone doesn't unlock teacher functionality - every
  // teacher-only feature (course creation, /api/teachers/me, analytics) also
  // requires a row in the separate, admin-managed `teachers` table. Without
  // this, a newly-assigned teacher would see no "create course" button
  // anywhere, with no indication why (this exact gap was hit and diagnosed
  // manually before this fix). ignoreDuplicates means this only inserts when
  // missing - it never touches an existing row, so re-assigning "teacher" to
  // someone already in that table can't silently undo a prior
  // suspendTeacher() call by resetting their status back to "active".
  if (roleName === "teacher") {
    const { error: teacherError } = await admin
      .from("teachers")
      .upsert({ user_id: targetUserId, status: "active" }, { onConflict: "user_id", ignoreDuplicates: true });
    if (teacherError) throw teacherError;

    // teacher_profiles is auto-created by the create_teacher_profile trigger
    // with only teacher_id set - display_name stays null until someone fills
    // it in. Without this, the teacher would be invisible on every public
    // page (the landing page and /api/teachers both filter out incomplete
    // profiles) until they found and used their own self-service profile
    // form. Re-fetching the id here (rather than relying on the upsert's
    // return value) works whether the row above was just inserted or already
    // existed, since ignoreDuplicates means the upsert doesn't return
    // conflicted rows.
    if (teacherProfile) {
      const { data: teacher, error: lookupError } = await admin
        .from("teachers")
        .select("id")
        .eq("user_id", targetUserId)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (teacher) {
        const { error: profileError } = await admin
          .from("teacher_profiles")
          .update(teacherProfile)
          .eq("teacher_id", teacher.id);
        if (profileError) throw profileError;
      }
    }
  }

  await logAudit({ actorUserId, action: "user.role_assigned", targetTable: "role_user", targetId: targetUserId, metadata: { role: roleName } });
}

export async function revokeRole(actorUserId: string, targetUserId: string, roleName: string): Promise<void> {
  const admin = createAdminClient();
  const { data: role } = await admin.from("roles").select("id").eq("name", roleName).maybeSingle();
  if (!role) throw new RoleNotFoundError(`الدور "${roleName}" مش موجود`);

  await admin.from("role_user").delete().eq("user_id", targetUserId).eq("role_id", role.id);
  await logAudit({ actorUserId, action: "user.role_revoked", targetTable: "role_user", targetId: targetUserId, metadata: { role: roleName } });
}

/** Soft delete (Section 23) - profiles.deleted_at, same column/pattern as
 * courses/lessons/comments/reviews. Hard-delete after HARD_DELETE_AFTER_HOURS
 * is hardDeleteDueUsers() below; restoreUser() undoes this while it's still
 * pending. */
export async function softDeleteUser(actorUserId: string, targetUserId: string): Promise<void> {
  const admin = createAdminClient();

  // courses.created_by is the one actor-reference column that still blocks
  // a real delete (see the migration comment on
  // 20260819100000_actor_columns_survive_hard_delete.sql) - checked up front
  // so the admin finds out now, not silently 1 hour later when the cron
  // job's deleteUser() call fails and nothing happens.
  const { data: courses, error: coursesError } = await admin
    .from("courses")
    .select("title")
    .eq("created_by", targetUserId)
    .limit(5);
  if (coursesError) throw coursesError;
  if (courses && courses.length > 0) {
    throw new TeacherHasCoursesError(courses.map((c) => c.title));
  }

  const { error } = await admin
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", targetUserId);
  if (error) throw error;
  await logAudit({ actorUserId, action: "user.soft_deleted", targetTable: "profiles", targetId: targetUserId });
}

/** Undoes softDeleteUser() while the account is still within its grace
 * window (deleted_at is only cleared here - once hardDeleteDueUsers() has
 * actually run, the auth.users row and everything under it is gone for
 * real, and there is nothing left to restore). */
export async function restoreUser(actorUserId: string, targetUserId: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ deleted_at: null })
    .eq("id", targetUserId)
    .not("deleted_at", "is", null)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new UserNotDeletedError("المستخدم ده مش محذوف أصلاً");
  await logAudit({ actorUserId, action: "user.restored", targetTable: "profiles", targetId: targetUserId });
}

/** Polled every 10 minutes by pg_cron via /api/admin/users/hard-delete-due
 * (Section 23). Uses the real Auth Admin API, which cascades to
 * profiles/devices/role_user etc. via ON DELETE CASCADE - everything else
 * (financial records, content attribution) goes to ON DELETE SET NULL
 * instead, see 20260819100000_actor_columns_survive_hard_delete.sql. */
export async function hardDeleteDueUsers(): Promise<{ deletedCount: number }> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - HARD_DELETE_AFTER_HOURS * 60 * 60 * 1000).toISOString();

  const { data: dueUsers } = await admin
    .from("profiles")
    .select("id")
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff);

  for (const user of dueUsers ?? []) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      console.error("hard-delete failed for user", user.id, error);
      continue;
    }
    await logAudit({ actorUserId: null, action: "user.hard_deleted", targetTable: "profiles", targetId: user.id });
  }

  return { deletedCount: dueUsers?.length ?? 0 };
}

/** Bulk version of the repair app/api/auth/login/route.ts already does for
 * one user at a time on their next login (self-service registration) - for
 * accounts already stuck on the handle_new_user() stub (confirmation link's
 * PKCE exchange failed because it was opened on a different device/browser
 * than signUp() started on) without waiting for each one to log back in.
 * Also catches accounts an admin already patched by hand-assigning a role
 * through the UI, which grants the role but not phone/grade/national_id -
 * self_registration_completed_at stays null either way, so both cases are
 * caught by the same query. Safe to run repeatedly -
 * completeSelfRegistrationIfNeeded() is itself idempotent. */
export async function repairIncompleteSelfRegistrations(actorUserId: string): Promise<{
  candidates: number;
  repaired: number;
  failed: Array<{ id: string; email: string | null; reason: string }>;
}> {
  const admin = createAdminClient();
  const { data: authList, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;

  const ids = authList.users.map((u) => u.id);
  const incompleteProfiles = await selectInChunks(ids, (batch) =>
    admin.from("profiles").select("id").is("self_registration_completed_at", null).in("id", batch),
  );
  const incompleteIds = new Set(incompleteProfiles.map((p) => p.id));

  const candidates = authList.users.filter((u) => {
    const metadata = u.user_metadata as SelfRegistrationMetadata | undefined;
    return incompleteIds.has(u.id) && (metadata?.role_type === "student" || metadata?.role_type === "parent");
  });

  const failed: Array<{ id: string; email: string | null; reason: string }> = [];
  let repaired = 0;

  for (const authUser of candidates) {
    const metadata = authUser.user_metadata as SelfRegistrationMetadata;
    try {
      const result = await completeSelfRegistrationIfNeeded(authUser.id, metadata);
      if (result.ok) {
        repaired++;
      } else {
        failed.push({ id: authUser.id, email: authUser.email ?? null, reason: result.reason });
      }
    } catch (error) {
      failed.push({
        id: authUser.id,
        email: authUser.email ?? null,
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  await logAudit({
    actorUserId,
    action: "users.self_registration_bulk_repair",
    metadata: { candidates: candidates.length, repaired, failed: failed.length },
  });

  return { candidates: candidates.length, repaired, failed };
}

export async function adminUpdateUserProfile(
  actorUserId: string,
  targetUserId: string,
  input: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    grade?: string | null;
    admin_notes?: string;
    password?: string;
  },
): Promise<void> {
  const admin = createAdminClient();

  const profileUpdate: Record<string, unknown> = {};
  if (input.first_name !== undefined) profileUpdate.first_name = input.first_name;
  if (input.last_name !== undefined) profileUpdate.last_name = input.last_name;
  if (input.phone !== undefined) profileUpdate.phone = input.phone || null;
  if (input.grade !== undefined) profileUpdate.grade = input.grade || null;
  if (input.admin_notes !== undefined) profileUpdate.admin_notes = input.admin_notes;

  if (Object.keys(profileUpdate).length > 0) {
    const { error: profileErr } = await admin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", targetUserId);
    if (profileErr) throw profileErr;
  }

  if (input.password && input.password.trim().length >= 6) {
    const { error: authErr } = await admin.auth.admin.updateUserById(targetUserId, {
      password: input.password.trim(),
    });
    if (authErr) throw authErr;
  }

  await logAudit({
    actorUserId,
    action: "user.admin_update",
    targetTable: "profiles",
    targetId: targetUserId,
    metadata: { updated_fields: Object.keys(input) },
  });
}

export async function adminKickDevice(
  actorUserId: string,
  targetUserId: string,
  deviceId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("devices")
    .delete()
    .eq("id", deviceId)
    .eq("user_id", targetUserId);
  if (error) throw error;

  await logAudit({
    actorUserId,
    action: "device.kicked",
    targetTable: "devices",
    targetId: deviceId,
    metadata: { target_user_id: targetUserId },
  });
}

export async function adminGrantCourseAccess(
  actorUserId: string,
  targetUserId: string,
  courseId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("course_entitlements")
    .upsert(
      {
        user_id: targetUserId,
        course_id: courseId,
        source: "admin_grant",
      },
      { onConflict: "user_id,course_id" },
    );

  if (error) throw error;

  await logAudit({
    actorUserId,
    action: "course.manual_grant",
    targetTable: "course_entitlements",
    targetId: courseId,
    metadata: { target_user_id: targetUserId },
  });
}

