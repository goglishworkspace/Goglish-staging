import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { processSubscriptionLifecycle } from "@/lib/services/subscription-lifecycle.service";
import {
  fulfillPaymentEvent,
  recordWebhookFailure,
  MAX_WEBHOOK_RETRIES,
} from "@/lib/services/webhook-processing.service";
import type { PaymentProviderName } from "@/lib/payments";

const RECONCILE_BATCH_SIZE = 50;

/** Hourly reconciliation (Section 9, scheduled by pg_cron - see
 * supabase/migrations/20260727110010_reconciliation_cron.sql): drains any
 * webhook events that failed processing and haven't exhausted their
 * retries, and advances subscription lifecycle state (active -> grace_period
 * -> expired). Protected by a shared secret since pg_net calls this without
 * a user session. */
export async function POST(request: NextRequest) {
  const expectedSecret = process.env.RECONCILE_SECRET;
  const provided = Buffer.from(request.headers.get("x-reconcile-secret") ?? "", "utf8");
  const expected = Buffer.from(expectedSecret ?? "", "utf8");
  if (!expectedSecret || provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: pendingEvents, error } = await admin
    .from("payment_webhook_events")
    .select("id, provider, provider_payment_id, status, retry_count")
    .eq("processed", false)
    .lt("retry_count", MAX_WEBHOOK_RETRIES)
    .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
    .limit(RECONCILE_BATCH_SIZE);
  // Throwing here escaped as a raw non-JSON 500 (same shape of bug the login
  // route was wrapped for) - pg_cron retries either way, but a JSON body keeps
  // the failure readable in logs instead of an opaque stack trace.
  if (error) {
    console.error("reconcile: failed to load pending webhook events", error);
    return NextResponse.json({ error: "failed to load pending events" }, { status: 500 });
  }

  let retried = 0;
  let stillFailing = 0;

  for (const event of pendingEvents ?? []) {
    try {
      await fulfillPaymentEvent({
        eventRowId: event.id,
        provider: event.provider as PaymentProviderName,
        providerPaymentId: event.provider_payment_id,
        status: event.status as "completed" | "failed",
      });
      retried += 1;
    } catch (fulfillError) {
      console.error("reconcile: webhook event still failing", event.id, fulfillError);
      await recordWebhookFailure(event.id);
      stillFailing += 1;
    }
  }

  const lifecycle = await processSubscriptionLifecycle();

  return NextResponse.json({
    ok: true,
    webhookEventsRetried: retried,
    webhookEventsStillFailing: stillFailing,
    subscriptions: lifecycle,
  });
}
