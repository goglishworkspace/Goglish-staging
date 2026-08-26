import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const GRACE_PERIOD_DAYS = 3;

/** Called hourly from /api/payments/reconcile: expired subscriptions move to
 * a grace period before losing access entirely (Section 9 - Subscription
 * Grace Period). Real auto-renewal charging is a separate concern (Stripe's
 * own Subscription object handles it there; other gateways are stubs) -
 * this only manages the access-lifecycle state, which is gateway-agnostic. */
export async function processSubscriptionLifecycle(): Promise<{ movedToGrace: number; expired: number }> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: toGrace, error: graceError } = await admin
    .from("user_subscriptions")
    .update({
      status: "grace_period",
      grace_period_ends_at: new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("status", "active")
    .lt("current_period_end", now)
    .select("id");
  if (graceError) throw graceError;

  const { data: toExpired, error: expireError } = await admin
    .from("user_subscriptions")
    .update({ status: "expired" })
    .eq("status", "grace_period")
    .lt("grace_period_ends_at", now)
    .select("id");
  if (expireError) throw expireError;

  return { movedToGrace: toGrace?.length ?? 0, expired: toExpired?.length ?? 0 };
}
