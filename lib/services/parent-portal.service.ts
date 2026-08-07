import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLevelForXp } from "./level.service";
import { getCourseProgressForStudent } from "./course-progress.service";
import { decryptNationalId } from "./national-id.service";
import { dispatchNotification } from "./notification-dispatch.service";
import { validateNationalId } from "@/lib/national-id";

export type LinkChildResult =
  | { ok: true; studentId: string; status: "pending" | "approved" }
  | { ok: false; reason: "invalid_format" | "not_found" };

/** Self-service equivalent of app/auth/callback/route.ts's parent-registration
 * auto-link (Section: "ولي الأمر يقدر يضيف رقم قومي لطالب اخر") - same
 * decrypt-and-compare match (national IDs are encrypted with a random IV, so
 * there's no equality-searchable index), reused so a parent can link
 * additional children after registration, not just the one national ID
 * given at signup.
 *
 * Knowing a valid national ID is enough to trigger this, so it can't grant
 * access by itself - the row is created 'pending' and the student gets an
 * approve/reject notification (Section: privacy - "الطالب ياكد اكونت ولي
 * الأمر"). Only that approval actually activates the link. */
export async function linkChildToParent(parentUserId: string, childNationalId: string): Promise<LinkChildResult> {
  if (!validateNationalId(childNationalId).valid) return { ok: false, reason: "invalid_format" };

  const admin = createAdminClient();
  const { data: studentRole } = await admin.from("roles").select("id").eq("name", "student").maybeSingle();
  if (!studentRole) return { ok: false, reason: "not_found" };

  const { data: studentLinks } = await admin.from("role_user").select("user_id").eq("role_id", studentRole.id);
  const studentUserIds = (studentLinks ?? []).map((r) => r.user_id as string);
  if (!studentUserIds.length) return { ok: false, reason: "not_found" };

  const { data: candidates } = await admin
    .from("profiles")
    .select("id, national_id_encrypted")
    .in("id", studentUserIds)
    .not("national_id_encrypted", "is", null);

  for (const candidate of candidates ?? []) {
    let decrypted: string;
    try {
      decrypted = decryptNationalId(candidate.national_id_encrypted as string);
    } catch {
      continue;
    }
    if (decrypted !== childNationalId) continue;

    const studentId = candidate.id as string;
    const { data: existing } = await admin
      .from("parent_student_links")
      .select("id, status")
      .eq("parent_user_id", parentUserId)
      .eq("student_user_id", studentId)
      .maybeSingle();

    if (existing?.status === "approved") return { ok: true, studentId, status: "approved" };
    if (existing?.status === "pending") return { ok: true, studentId, status: "pending" };

    // No row yet, or a previously-rejected one - (re)create as a fresh
    // pending request rather than silently no-op'ing a rejection forever.
    let linkId: string;
    if (existing) {
      const { data: updated } = await admin
        .from("parent_student_links")
        .update({ status: "pending" })
        .eq("id", existing.id)
        .select("id")
        .single();
      linkId = updated!.id as string;
    } else {
      const { data: inserted } = await admin
        .from("parent_student_links")
        .insert({ parent_user_id: parentUserId, student_user_id: studentId, status: "pending" })
        .select("id")
        .single();
      linkId = inserted!.id as string;
    }

    const { data: parentProfile } = await admin
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", parentUserId)
      .maybeSingle();
    const parentName = `${parentProfile?.first_name ?? ""} ${parentProfile?.last_name ?? ""}`.trim() || "ولي أمر";
    await dispatchNotification({
      userId: studentId,
      type: "parent_link_request",
      title: "طلب ربط حساب ولي أمر",
      body: `${parentName} طلب يتابع حسابك كولي أمر - يقبل / يرفض؟`,
      metadata: { link_id: linkId, parent_user_id: parentUserId },
    });

    return { ok: true, studentId, status: "pending" };
  }
  return { ok: false, reason: "not_found" };
}

export async function isParentOfStudent(parentUserId: string, studentId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("parent_student_links")
    .select("id")
    .eq("parent_user_id", parentUserId)
    .eq("student_user_id", studentId)
    .eq("status", "approved")
    .maybeSingle();
  return !!data;
}

export async function getLinkedChildren(
  parentUserId: string,
): Promise<Array<{ student_id: string; first_name: string; last_name: string; status: string }>> {
  const admin = createAdminClient();
  const { data: links } = await admin
    .from("parent_student_links")
    .select("student_user_id, status")
    .eq("parent_user_id", parentUserId);
  if (!links?.length) return [];

  // parent_student_links.student_user_id and profiles.id are sibling FKs to
  // auth.users, not FKs to each other - PostgREST can't embed across that
  // (same situation as the leaderboard route in Phase 5).
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, first_name, last_name")
    .in(
      "id",
      links.map((link) => link.student_user_id),
    );
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return links.map((link) => {
    const profile = profileById.get(link.student_user_id);
    return {
      student_id: link.student_user_id,
      first_name: profile?.first_name ?? "",
      last_name: profile?.last_name ?? "",
      status: link.status as string,
    };
  });
}

/** Aggregates everything Section 13 lists a parent can see for their own
 * child - course progress/watch-time, grades, XP/ranking, subscription,
 * upcoming exams, and last login. Callers must check isParentOfStudent()
 * first - this function does no authorization itself. */
export async function getChildOverview(studentId: string) {
  const admin = createAdminClient();

  const [
    { data: profile },
    courses,
    { data: quizAttempts },
    { data: examAttempts },
    { data: subscription },
    { data: entitlements },
    { data: authUser },
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("first_name, last_name, xp_total, coins_total, current_streak_days")
      .eq("id", studentId)
      .single(),
    getCourseProgressForStudent(admin, studentId),
    admin
      .from("student_quiz_attempts")
      .select("id, score_percent, passed, submitted_at, quizzes(title)")
      .eq("user_id", studentId)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false })
      .limit(40),
    admin
      .from("student_exam_attempts")
      .select("id, score_percent, passed, submitted_at, exams(title)")
      .eq("user_id", studentId)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false })
      .limit(20),
    admin
      .from("user_subscriptions")
      .select("status, current_period_end, subscription_plans(name, kind)")
      .eq("user_id", studentId)
      .in("status", ["active", "grace_period"])
      .maybeSingle(),
    admin.from("course_entitlements").select("course_id").eq("user_id", studentId).is("revoked_at", null),
    admin.auth.admin.getUserById(studentId),
  ]);

  const courseIds = (entitlements ?? []).map((e) => e.course_id);

  const [{ data: upcomingExams }, { data: rankRow }] = await Promise.all([
    courseIds.length
      ? admin
          .from("exams")
          .select("id, title, course_id")
          .in("course_id", courseIds)
          .eq("status", "published")
          .limit(10)
      : Promise.resolve({ data: [] }),
    admin.from("leaderboard_cache").select("rank").eq("scope", "global").eq("user_id", studentId).maybeSingle(),
  ]);

  const level = await getLevelForXp(profile?.xp_total ?? 0);

  return {
    student: { first_name: profile?.first_name, last_name: profile?.last_name },
    last_login_at: authUser?.user?.last_sign_in_at ?? null,
    courses,
    gamification: {
      xp_total: profile?.xp_total ?? 0,
      coins_total: profile?.coins_total ?? 0,
      current_streak_days: profile?.current_streak_days ?? 0,
      level,
      global_rank: rankRow?.rank ?? null,
    },
    quiz_results: quizAttempts ?? [],
    exam_results: examAttempts ?? [],
    subscription: subscription ?? null,
    upcoming_exams: upcomingExams ?? [],
  };
}

/** Section 13 - parents can see their own child's notifications (not listed
 * in the spec's explicit field list, but required by the Phase 11 "Parent
 * Portal: Notifications" checklist item). notifications is otherwise always
 * self-scoped (app/api/notifications), so this is a distinct parent-scoped
 * path rather than a loosened version of that route. */
export async function getChildNotifications(studentId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .select("*")
    .eq("user_id", studentId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}
