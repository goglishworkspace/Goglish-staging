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
