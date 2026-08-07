import "server-only";
import crypto from "node:crypto";
import querystring from "node:querystring";
import type {
  PaymentProvider,
  CreateCheckoutParams,
  CreateCheckoutResult,
  ParsedWebhookEvent,
  RefundResult,
} from "./types";

type KashierMode = "test" | "live";

function getMode(): KashierMode {
  return process.env.KASHER_MODE === "live" ? "live" : "test";
}

function getConfig() {
  const merchantId = process.env.KASHER_MERCHANT_ID;
  const paymentApiKey = process.env.KASHER_HMAC_SECRET;
  const secretKey = process.env.KASHER_SECRET_KEY;
  if (!merchantId || !paymentApiKey || !secretKey) {
    throw new Error("Kashier is not configured (KASHER_MERCHANT_ID / KASHER_HMAC_SECRET / KASHER_SECRET_KEY)");
  }
  return { merchantId, paymentApiKey, secretKey, mode: getMode() };
}

// Payment session creation + the transactions-search API share this host;
// the refund API lives on a separate "fep" host entirely (see refund()).
function apiBaseUrl(mode: KashierMode): string {
  return mode === "live" ? "https://api.kashier.io" : "https://test-api.kashier.io";
}

function refundBaseUrl(mode: KashierMode): string {
  return mode === "live" ? "https://fep.kashier.io" : "https://test-fep.kashier.io";
}

/**
 * Real Kashier integration (Section 9's "kasher" gateway), built against
 * developers.kashier.io (Payment Sessions, Webhooks > Signature, Payment >
 * Transactions, Payment > Refund) on 2026-08-07. Two keys are involved:
 * the Payment API Key (KASHER_HMAC_SECRET - also used by the shared stub
 * pattern's naming) signs/verifies, the Secret Key (KASHER_SECRET_KEY)
 * authenticates server-to-server calls (session create, transaction
 * lookup, refund).
 *
 * providerPaymentId is deliberately `idempotencyKey`, not Kashier's own
 * session `_id` - `_id` never reappears in the webhook payload, but the
 * `order` field we send at session-creation time comes back verbatim as
 * `data.merchantOrderId`, so using our own idempotency key there is the
 * only value guaranteed to round-trip and let fulfillPaymentEvent() find
 * the matching `payments` row (see webhook-processing.service.ts).
 */
export class KashierProvider implements PaymentProvider {
  readonly name = "kasher" as const;

  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    const { merchantId, paymentApiKey, secretKey, mode } = getConfig();
    const origin = new URL(params.successUrl).origin;

    const response = await fetch(`${apiBaseUrl(mode)}/v3/payment/sessions`, {
      method: "POST",
      headers: {
        Authorization: secretKey,
        "api-key": paymentApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expireAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        maxFailureAttempts: 3,
        amount: (params.amountCents / 100).toFixed(2),
        currency: params.currency,
        order: params.idempotencyKey,
        merchantId,
        mode,
        merchantRedirect: params.successUrl,
        display: "ar",
        type: "one-time",
        description: `Goglish order ${params.orderId}`,
        serverWebhook: `${origin}/api/payments/webhooks/kasher`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Kashier session creation failed: ${response.status} ${await response.text()}`);
    }
    const session = (await response.json()) as { sessionUrl?: string };
    if (!session.sessionUrl) throw new Error("Kashier did not return a sessionUrl");

    return { checkoutUrl: session.sessionUrl, providerPaymentId: params.idempotencyKey };
  }

  verifyWebhookSignature(rawBody: string, headers: Headers): boolean {
    const signature = headers.get("x-kashier-signature");
    const paymentApiKey = process.env.KASHER_HMAC_SECRET;
    if (!signature || !paymentApiKey) return false;

    try {
      const body = JSON.parse(rawBody) as { data?: Record<string, unknown> & { signatureKeys?: string[] } };
      const data = body.data;
      if (!data?.signatureKeys?.length) return false;

      const subset: Record<string, string> = {};
      for (const key of data.signatureKeys) subset[key] = String(data[key] ?? "");
      const message = querystring.stringify(subset);

      const expected = crypto.createHmac("sha256", paymentApiKey).update(message).digest("hex");
      if (signature.length !== expected.length) return false;
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  // Only ever called after verifyWebhookSignature() has returned true.
  parseWebhookEvent(rawBody: string): ParsedWebhookEvent | null {
    const body = JSON.parse(rawBody) as {
      event?: string;
      data?: { transactionId?: string; merchantOrderId?: string; status?: string };
    };
    // Transaction webhooks also fire for capture/authorize/void/reversal/
    // refund - only "pay" reports the outcome of the checkout itself.
    if (body.event !== "pay") return null;
    const data = body.data;
    if (!data?.transactionId || !data.merchantOrderId || !data.status) return null;

    if (data.status === "SUCCESS") {
      return { eventId: data.transactionId, providerPaymentId: data.merchantOrderId, status: "completed" };
    }
    if (["FAILURE", "EXPIRED", "CANCEL", "REVOKED"].includes(data.status)) {
      return { eventId: data.transactionId, providerPaymentId: data.merchantOrderId, status: "failed" };
    }
    // PENDING / INITIATED / UNKNOWN - asynchronous method still settling,
    // a further webhook will follow with a final status.
    return null;
  }

  async refund(params: { providerPaymentId: string; amountCents: number }): Promise<RefundResult> {
    const { secretKey, mode } = getConfig();

    // providerPaymentId is our merchantOrderId - Kashier's refund endpoint
    // needs its own internal order id instead, so look the transaction up
    // first (same shape as StripeProvider.refund()'s session->intent hop).
    const searchUrl = `${apiBaseUrl(mode)}/v2/aggregator/transactions?search=${encodeURIComponent(params.providerPaymentId)}&limit=1`;
    const searchResponse = await fetch(searchUrl, { headers: { Authorization: secretKey } });
    if (!searchResponse.ok) return { success: false };
    const searchResult = (await searchResponse.json()) as { body?: Array<{ id?: string }> };
    const kashierOrderId = searchResult.body?.[0]?.id;
    if (!kashierOrderId) return { success: false };

    const refundResponse = await fetch(`${refundBaseUrl(mode)}/v3/orders/${kashierOrderId}`, {
      method: "PUT",
      headers: { Authorization: secretKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        apiOperation: "REFUND",
        reason: "Refund requested via Goglish admin",
        transaction: { amount: params.amountCents / 100 },
      }),
    });
    if (!refundResponse.ok) return { success: false };
    const result = (await refundResponse.json()) as { status?: string; transactionId?: string };

    return {
      success: result.status === "SUCCESS",
      providerRefundId: result.transactionId,
    };
  }
}
