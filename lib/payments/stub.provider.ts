import "server-only";
import crypto from "node:crypto";
import type {
  PaymentProvider,
  PaymentProviderName,
  CreateCheckoutParams,
  CreateCheckoutResult,
  ParsedWebhookEvent,
  RefundResult,
} from "./types";

/**
 * Shared stub for the Egyptian gateways (Paymob, Vodafone Cash, Instapay,
 * Kasher) - no real merchant accounts exist yet. Structurally consistent
 * with how these gateways commonly work (redirect checkout + HMAC-signed
 * webhook callback), but the exact request/response shapes here are
 * reasonable placeholders, NOT verified against each provider's current API
 * docs (that lookup was unavailable while building this). Only this file
 * needs to change once real credentials + docs are available - everything
 * that calls PaymentProvider stays the same.
 */
export class StubPaymentProvider implements PaymentProvider {
  constructor(
    readonly name: PaymentProviderName,
    private readonly secretEnvVar: string,
  ) {}

  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    const providerPaymentId = `stub_${this.name}_${crypto.randomUUID()}`;
    const origin = new URL(params.successUrl).origin;
    const checkoutUrl = new URL(`/checkout/mock/${providerPaymentId}`, origin);
    checkoutUrl.searchParams.set("provider", this.name);
    checkoutUrl.searchParams.set("order", params.orderId);
    // Forwarded so the mock page can land the student exactly where a real
    // gateway's redirect would - same successUrl/cancelUrl the caller built.
    checkoutUrl.searchParams.set("success_url", params.successUrl);
    checkoutUrl.searchParams.set("cancel_url", params.cancelUrl);
    return { checkoutUrl: checkoutUrl.toString(), providerPaymentId };
  }

  verifyWebhookSignature(rawBody: string, headers: Headers): boolean {
    const secret = process.env[this.secretEnvVar];
    const signature = headers.get(`x-${this.name.replace(/_/g, "-")}-signature`);
    if (!secret || !signature) return false;

    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    if (signature.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  parseWebhookEvent(rawBody: string): ParsedWebhookEvent | null {
    try {
      const body = JSON.parse(rawBody) as {
        event_id?: string;
        payment_id?: string;
        status?: string;
      };
      if (!body.event_id || !body.payment_id || !body.status) return null;
      return {
        eventId: body.event_id,
        providerPaymentId: body.payment_id,
        status: body.status === "success" ? "completed" : "failed",
      };
    } catch {
      return null;
    }
  }

  async refund(): Promise<RefundResult> {
    return { success: true, providerRefundId: `stub_refund_${crypto.randomUUID()}` };
  }
}
