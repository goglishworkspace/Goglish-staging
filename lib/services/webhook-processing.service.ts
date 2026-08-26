import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantCourseAccess, grantBundleAccess } from "./entitlement.service";
import { generateInvoice } from "./invoice.service";
import { notifyPaymentCompleted } from "./notification.service";
import { MAX_PAYMENT_ATTEMPTS } from "./payment-state-machine.service";
import type { PaymentProviderName } from "@/lib/payments";

export const MAX_WEBHOOK_RETRIES = 3;

/** Idempotently logs a webhook event. Returns the row plus whether it was
 * already processed (caller should stop if so - this is the idempotency
 * guarantee for both the live webhook route and the reconciliation retry). */
export async function recordWebhookEvent(params: {
  provider: PaymentProviderName;
  eventId: string;
  providerPaymentId: string;
  status: "completed" | "failed";
  payload: unknown;
}): Promise<{ id: string; processed: boolean }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payment_webhook_events")
    .upsert(
      {
        provider: params.provider,
        event_id: params.eventId,
        provider_payment_id: params.providerPaymentId,
        status: params.status,
        payload: params.payload as object,
      },
      { onConflict: "provider,event_id", ignoreDuplicates: false },
    )
    .select("id, processed")
    .single();
  if (error) throw error;
  return data;
}

/** Does the actual work for one webhook event: transitions the matching
 * payment, and on success fulfils the order (grants access / creates the
 * subscription), generates the invoice, and sends notifications. Marks the
 * event row processed only once all of that succeeds - if it throws
 * partway, the caller should NOT mark it processed, so a retry can pick up
 * cleanly (every step here is upsert/idempotent-safe to re-run). */
export async function fulfillPaymentEvent(params: {
  eventRowId: string;
  provider: PaymentProviderName;
  providerPaymentId: string;
  status: "completed" | "failed";
}): Promise<void> {
  const admin = createAdminClient();

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("id, order_id, status, attempt_number")
    .eq("provider_payment_id", params.providerPaymentId)
    .eq("provider", params.provider)
    .maybeSingle();
  if (paymentError) throw paymentError;

  if (!payment) {
    // No matching payment attempt (e.g. a stray/test event) - nothing to do,
    // but still counts as "handled".
    await markEventProcessed(params.eventRowId);
    return;
  }

  if (payment.status === "completed" || payment.status === "cancelled") {
    await markEventProcessed(params.eventRowId);
    return;
  }

  if (params.status === "failed") {
    const nextStatus = payment.attempt_number >= MAX_PAYMENT_ATTEMPTS ? "cancelled" : "retrying";
    await admin
      .from("payments")
      .update({ status: nextStatus, failure_reason: "provider_reported_failure" })
      .eq("id", payment.id);
    if (nextStatus === "cancelled") {
      await admin.from("orders").update({ status: "cancelled" }).eq("id", payment.order_id);
    }
    await markEventProcessed(params.eventRowId);
    return;
  }

  // status === "completed" - fulfil the order BEFORE marking the payment
  // completed. The early-return above treats a "completed" payment as
  // already handled, so marking it completed first meant a retry after
  // fulfillOrder() failed partway (invoice storage, access grant, ...) would
  // hit that early-return and skip fulfillment forever, even though the
  // student was charged. Fulfilling first means a failure here leaves the
  // payment in its prior status, so the next webhook delivery or the hourly
  // reconciliation job retries the whole thing - safe since every step
  // inside fulfillOrder() is upsert/idempotent per its own comment.
  await fulfillOrder(payment.order_id);

  await admin
    .from("payments")
    .update({ status: "completed", completed_at: new Date().toISOString(), failure_reason: null })
    .eq("id", payment.id);

  await markEventProcessed(params.eventRowId);
}

/** Grants access/subscription for a paid-in-full order, generates its
 * invoice, and notifies the buyer - shared by the real payment-webhook path
 * above and the free-checkout path (order.total_cents === 0), which skips
 * the payment provider entirely but still needs the same fulfilment.
 * Idempotent: re-running for an already-completed order is harmless
 * (entitlements/subscriptions/invoice all upsert or no-op on conflict). */
export async function fulfillOrder(orderId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: order, error: orderError } = await admin.from("orders").select("*").eq("id", orderId).single();
  if (orderError) throw orderError;

  await admin.from("orders").update({ status: "completed" }).eq("id", order.id);

  // uses_count is now reserved atomically at order-creation time (see
  // reserve_coupon_use in supabase/migrations/20260801100019_security_fix_coupon_atomic.sql,
  // wired in app/api/orders/route.ts) - incrementing it again here would
  // double-count every completed purchase against the coupon's max_uses.

  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", order.user_id)
    .single();
  const studentName = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "Student";

  let itemTitle = "";
  let isPremium = false;

  if (order.item_type === "course") {
    const { data: course } = await admin.from("courses").select("title").eq("id", order.item_id).maybeSingle();
    itemTitle = course?.title ?? "Course";
    await grantCourseAccess(order.user_id, order.item_id, order.coupon_id ? "coupon" : "purchase", order.id);
  } else if (order.item_type === "bundle") {
    const { data: bundle } = await admin
      .from("course_bundles")
      .select("title")
      .eq("id", order.item_id)
      .maybeSingle();
    itemTitle = bundle?.title ?? "Bundle";
    await grantBundleAccess(order.user_id, order.item_id, order.id);
  } else {
    const { data: plan } = await admin
      .from("subscription_plans")
      .select("name, duration_days, includes_parent_tracking")
      .eq("id", order.item_id)
      .maybeSingle();
    itemTitle = plan?.name ?? "Subscription";
    isPremium = !!plan?.includes_parent_tracking;

    const { data: existingSub } = await admin
      .from("user_subscriptions")
      .select("id")
      .eq("order_id", order.id)
      .maybeSingle();
    if (!existingSub) {
      const periodEnd = new Date(Date.now() + (plan?.duration_days ?? 30) * 24 * 60 * 60 * 1000);
      await admin.from("user_subscriptions").insert({
        user_id: order.user_id,
        plan_id: order.item_id,
        current_period_end: periodEnd.toISOString(),
        order_id: order.id,
      });
    }
  }

  await generateInvoice({
    userId: order.user_id,
    orderId: order.id,
    studentName,
    itemTitle,
    subtotalCents: order.subtotal_cents,
    discountCents: order.discount_cents,
    taxCents: order.tax_cents,
    totalCents: order.total_cents,
    currency: order.currency,
  });

  await notifyPaymentCompleted({
    userId: order.user_id,
    itemTitle,
    totalCents: order.total_cents,
    currency: order.currency,
    isPremium,
  });
}

async function markEventProcessed(eventRowId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("payment_webhook_events")
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq("id", eventRowId);
}

/** Called when fulfillPaymentEvent() throws - records the retry with
 * exponential backoff (1min, 2min, 4min...) so the hourly reconciliation
 * job (which runs far less often than that) is really a safety net on top
 * of the provider's own webhook delivery retries, not the primary retry
 * mechanism. Section 9: "Retry Logic (3 مرات exponential backoff)". */
export async function recordWebhookFailure(eventRowId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("payment_webhook_events")
    .select("retry_count")
    .eq("id", eventRowId)
    .single();
  const retryCount = (event?.retry_count ?? 0) + 1;
  const backoffMinutes = Math.pow(2, retryCount - 1);

  await admin
    .from("payment_webhook_events")
    .update({
      retry_count: retryCount,
      next_retry_at: new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString(),
    })
    .eq("id", eventRowId);
}
