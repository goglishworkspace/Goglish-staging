import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublishedLesson } from "./phase2-fixtures";
import { TEST_BASE_URL } from "./test-env";

export async function createPricedCourse(
  priceCents = 10000,
  lessonFields: Record<string, unknown> = {},
) {
  const setup = await createPublishedLesson(lessonFields);
  const admin = createAdminClient();
  await admin.from("courses").update({ price_cents: priceCents, currency: "EGP" }).eq("id", setup.courseId);
  return setup;
}

type StubProvider = "paymob" | "vodafone_cash" | "instapay";

const SECRET_ENV_VAR: Record<StubProvider, string> = {
  paymob: "PAYMOB_HMAC_SECRET",
  vodafone_cash: "VODAFONE_CASH_HMAC_SECRET",
  instapay: "INSTAPAY_HMAC_SECRET",
};

/** Builds a correctly-signed event and posts it straight to
 * /api/payments/webhooks/[provider] - the same path a real provider webhook
 * (or the mock checkout page) would hit. */
export async function simulateProviderWebhook(
  provider: StubProvider,
  providerPaymentId: string,
  outcome: "success" | "failure",
  eventId: string = crypto.randomUUID(),
) {
  const secret = process.env[SECRET_ENV_VAR[provider]]!;
  const eventPayload = {
    event_id: eventId,
    payment_id: providerPaymentId,
    status: outcome === "success" ? "success" : "failed",
  };
  const rawBody = JSON.stringify(eventPayload);
  const signature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const headerName = `x-${provider.replace(/_/g, "-")}-signature`;

  const res = await fetch(`${TEST_BASE_URL}/api/payments/webhooks/${provider}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", [headerName]: signature },
    body: rawBody,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

export function providerPaymentIdFromCheckoutUrl(checkoutUrl: string): string {
  return new URL(checkoutUrl).pathname.split("/").pop()!;
}
