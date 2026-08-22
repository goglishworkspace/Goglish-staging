import "server-only";
import type {
  PaymentProvider,
  CreateCheckoutParams,
  CreateCheckoutResult,
  ParsedWebhookEvent,
  RefundResult,
} from "./types";

/**
 * Daffaa (github.com/mashroecom/daffaa-sdks) - a temporary, additional
 * gateway alongside Kashier while Kashier's own issues get sorted out. It
 * confirms e-wallet/InstaPay transfers by reading SMS: there's no hosted
 * checkout redirect, no refund API, and no signed server-to-server webhook
 * - the SDK's own docs say to always re-verify a webhook body against the
 * API before trusting it, i.e. it isn't a source of truth on its own.
 *
 * So unlike Stripe/Kashier, createCheckout() never calls Daffaa - it just
 * points the browser at our own /checkout/daffaa page, which shows the
 * store's wallet numbers and lets the student paste back the reference
 * their wallet app gave them after they send the transfer manually. That
 * page's confirm action (app/api/payments/daffaa/confirm/route.ts) calls
 * daffaaVerify() directly and reuses the same fulfillPaymentEvent()
 * idempotent-fulfilment path a real webhook would use - so the generic
 * /api/payments/webhooks/daffaa route is never actually hit by Daffaa in
 * practice, and verifyWebhookSignature() below fails closed accordingly.
 */
export class DaffaaProvider implements PaymentProvider {
  readonly name = "daffaa" as const;

  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    const checkoutUrl = new URL(`/checkout/daffaa/${params.idempotencyKey}`, params.successUrl);
    checkoutUrl.searchParams.set("amount_cents", String(params.amountCents));
    checkoutUrl.searchParams.set("currency", params.currency);
    checkoutUrl.searchParams.set("success_url", params.successUrl);
    checkoutUrl.searchParams.set("cancel_url", params.cancelUrl);
    return { checkoutUrl: checkoutUrl.toString(), providerPaymentId: params.idempotencyKey };
  }

  verifyWebhookSignature(): boolean {
    return false;
  }

  parseWebhookEvent(): ParsedWebhookEvent | null {
    return null;
  }

  async refund(): Promise<RefundResult> {
    // Daffaa has no refund endpoint - a Daffaa-paid order has to be refunded
    // back to the student's wallet manually by staff, outside the app.
    return { success: false };
  }
}
