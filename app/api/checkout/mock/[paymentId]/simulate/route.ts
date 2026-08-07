import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({ outcome: z.enum(["success", "failure"]) });

const SECRET_ENV_VAR: Record<string, string> = {
  paymob: "PAYMOB_HMAC_SECRET",
  vodafone_cash: "VODAFONE_CASH_HMAC_SECRET",
  instapay: "INSTAPAY_HMAC_SECRET",
  kasher: "KASHER_HMAC_SECRET",
};

/**
 * Dev-only helper behind the mock checkout page: builds a correctly
 * HMAC-signed event and POSTs it to our own /api/payments/webhooks/[provider]
 * route, exercising the exact same signature-verification + idempotency +
 * fulfillment path a real provider webhook would hit. `paymentId` here is
 * the *provider* payment id (stub_<provider>_<uuid>), matching the path
 * segment stub.provider.ts put in the checkout URL.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  if (process.env.NODE_ENV === "production" || process.env.ENABLE_MOCK_PAYMENTS !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { paymentId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("provider, provider_payment_id")
    .eq("provider_payment_id", paymentId)
    .maybeSingle();
  if (!payment) return NextResponse.json({ error: "payment not found" }, { status: 404 });

  const secretEnvVar = SECRET_ENV_VAR[payment.provider];
  const secret = secretEnvVar ? process.env[secretEnvVar] : undefined;
  if (!secret) return NextResponse.json({ error: "provider not simulate-able" }, { status: 400 });

  const eventPayload = {
    event_id: crypto.randomUUID(),
    payment_id: payment.provider_payment_id,
    status: parsed.data.outcome === "success" ? "success" : "failed",
  };
  const rawBody = JSON.stringify(eventPayload);
  const signature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const headerName = `x-${payment.provider.replace(/_/g, "-")}-signature`;

  const webhookUrl = new URL(`/api/payments/webhooks/${payment.provider}`, request.nextUrl.origin);
  const webhookRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", [headerName]: signature },
    body: rawBody,
  });

  return NextResponse.json({ ok: webhookRes.ok, status: webhookRes.status });
}
