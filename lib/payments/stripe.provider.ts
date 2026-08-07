import "server-only";
import Stripe from "stripe";
import type {
  PaymentProvider,
  CreateCheckoutParams,
  CreateCheckoutResult,
  ParsedWebhookEvent,
  RefundResult,
} from "./types";

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

/** Real Stripe integration - Checkout Sessions + webhook signature
 * verification, per Stripe's documented API (the one gateway here we have
 * solid, verifiable documentation for). */
export class StripeProvider implements PaymentProvider {
  readonly name = "stripe" as const;

  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: params.currency.toLowerCase(),
              unit_amount: params.amountCents,
              product_data: { name: `Goglish order ${params.orderId}` },
            },
            quantity: 1,
          },
        ],
        customer_email: params.customerEmail,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: { order_id: params.orderId },
      },
      { idempotencyKey: params.idempotencyKey },
    );

    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { checkoutUrl: session.url, providerPaymentId: session.id };
  }

  verifyWebhookSignature(rawBody: string, headers: Headers): boolean {
    const signature = headers.get("stripe-signature");
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!signature || !secret) return false;
    try {
      getStripeClient().webhooks.constructEvent(rawBody, signature, secret);
      return true;
    } catch {
      return false;
    }
  }

  // Only ever called after verifyWebhookSignature() has returned true - the
  // webhook route validates first, then parses.
  parseWebhookEvent(rawBody: string): ParsedWebhookEvent | null {
    const event = JSON.parse(rawBody) as Stripe.Event;

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      return { eventId: event.id, providerPaymentId: session.id, status: "completed" };
    }
    if (event.type === "checkout.session.expired" || event.type === "payment_intent.payment_failed") {
      const obj = event.data.object as { id: string };
      return { eventId: event.id, providerPaymentId: obj.id, status: "failed" };
    }
    return null;
  }

  async refund(params: { providerPaymentId: string; amountCents: number }): Promise<RefundResult> {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(params.providerPaymentId);
    if (!session.payment_intent) return { success: false };

    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: params.amountCents,
    });
    return {
      success: refund.status === "succeeded" || refund.status === "pending",
      providerRefundId: refund.id,
    };
  }
}
