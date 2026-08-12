import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/** Permanent access to one course (purchase/bundle/coupon) - Section 3:
 * "الكورسات المشتراة متاحة للأبد". Always via the admin client: granted only
 * by the payment webhook/refund flow, never a direct client write. */
export async function grantCourseAccess(
  userId: string,
  courseId: string,
  source: "purchase" | "bundle" | "coupon",
  orderId: string | null,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("course_entitlements")
    .upsert(
      { user_id: userId, course_id: courseId, source, order_id: orderId, revoked_at: null },
      { onConflict: "user_id,course_id" },
    );
  if (error) throw error;
}

export async function grantBundleAccess(
  userId: string,
  bundleId: string,
  orderId: string | null,
): Promise<void> {
  const admin = createAdminClient();
  const { data: bundleCourses, error } = await admin
    .from("bundle_courses")
    .select("course_id")
    .eq("bundle_id", bundleId);
  if (error) throw error;

  for (const { course_id } of bundleCourses ?? []) {
    await grantCourseAccess(userId, course_id, "bundle", orderId);
  }
}

/** When new courses are added to a bundle, existing buyers don't get them
 * automatically - grantBundleAccess only runs at purchase time, off the
 * bundle's course list as it stood then. Grants the new courses to every
 * past buyer of the bundle so a "new course in your bundle" notification
 * never points at content the student still can't open. */
export async function grantNewBundleCoursesToExistingBuyers(bundleId: string, newCourseIds: string[]): Promise<void> {
  if (!newCourseIds.length) return;
  const admin = createAdminClient();
  const { data: orders, error } = await admin
    .from("orders")
    .select("id, user_id")
    .eq("item_type", "bundle")
    .eq("item_id", bundleId)
    .eq("status", "completed");
  if (error) throw error;

  for (const order of orders ?? []) {
    for (const courseId of newCourseIds) {
      await grantCourseAccess(order.user_id, courseId, "bundle", order.id);
    }
  }
}

/** Read-only checks reuse the caller's session client - RLS already scopes
 * both tables to "your own rows", which is exactly what's needed here. */
export async function hasActiveSubscription(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["active", "grace_period"])
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** A bundle is "owned" once its order completes (checkout already grants
 * per-course entitlements via grantBundleAccess) - this just answers "did
 * this user already buy this bundle" for the bundle detail page's
 * enroll-vs-continue CTA, same role hasCourseAccess plays for courses. */
export async function hasBundleAccess(
  supabase: SupabaseClient,
  userId: string,
  bundleId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("orders")
    .select("id")
    .eq("user_id", userId)
    .eq("item_type", "bundle")
    .eq("item_id", bundleId)
    .eq("status", "completed")
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/** Batch version of hasCourseAccess - lets CourseCard show "اشتراك" vs
 * "إكمال التعلم" straight on the card for a whole list at once (GET
 * /api/courses, and each course embedded inside a bundle's response), no
 * per-course round-trip needed. Anonymous visitors (and courses they're not
 * entitled to) just get has_access: false. The active-subscription check
 * covers every course while it's active, so it's done once for the whole
 * list rather than per course. */
export async function attachCourseAccess<T extends { id: string }>(
  supabase: SupabaseClient,
  courses: T[],
): Promise<Array<T & { has_access: boolean }>> {
  if (!courses.length) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return courses.map((course) => ({ ...course, has_access: false }));

  const { data: entitlements } = await supabase
    .from("course_entitlements")
    .select("course_id")
    .eq("user_id", user.id)
    .in(
      "course_id",
      courses.map((c) => c.id),
    )
    .is("revoked_at", null);
  const entitledIds = new Set((entitlements ?? []).map((e) => e.course_id));
  const hasSub = await hasActiveSubscription(supabase, user.id);

  return courses.map((course) => ({ ...course, has_access: entitledIds.has(course.id) || hasSub }));
}

/** Same enrichment as attachCourseAccess(), but for the courses embedded
 * inside a bundle's response (bundle_courses[].courses) - CourseCard needs
 * has_access there too, since buying a bundle grants access to every course
 * in it (see grantBundleAccess above). Dedupes across bundles first so a
 * course shared by two bundles is only checked once. */
export async function attachAccessToBundles<
  B extends { bundle_courses: { course_id: string; courses: ({ id: string } & Record<string, unknown>) | null }[] },
>(supabase: SupabaseClient, bundles: B[]): Promise<B[]> {
  const courseMap = new Map<string, { id: string } & Record<string, unknown>>();
  for (const bundle of bundles) {
    for (const bc of bundle.bundle_courses) {
      if (bc.courses) courseMap.set(bc.course_id, bc.courses);
    }
  }

  const enriched = await attachCourseAccess(supabase, [...courseMap.values()]);
  const enrichedMap = new Map(enriched.map((course) => [course.id, course]));

  return bundles.map((bundle) => ({
    ...bundle,
    bundle_courses: bundle.bundle_courses.map((bc) => ({
      ...bc,
      courses: bc.courses ? (enrichedMap.get(bc.course_id) ?? bc.courses) : null,
    })),
  }));
}

/** A course is accessible if bought outright (permanent) or covered by an
 * active/grace-period subscription (Section 3 - subscriptions grant ongoing
 * access to content while active, not permanent ownership). */
export async function hasCourseAccess(
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
): Promise<boolean> {
  const { data: entitlement } = await supabase
    .from("course_entitlements")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .is("revoked_at", null)
    .maybeSingle();
  if (entitlement) return true;

  return hasActiveSubscription(supabase, userId);
}
