export type PaymentProviderName = "stripe" | "paymob" | "vodafone_cash" | "instapay" | "kasher";

export type CreateCheckoutParams = {
  orderId: string;
  amountCents: number;
  currency: string;
  idempotencyKey: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail: string;
};

export type CreateCheckoutResult = {
  checkoutUrl: string;
  providerPaymentId: string;
};

export type ParsedWebhookEvent = {
  eventId: string;
  providerPaymentId: string;
  status: "completed" | "failed";
};

export type RefundResult = {
  success: boolean;
  providerRefundId?: string;
};

/** One interface for every payment gateway (Section 9). Stripe implements
 * this for real; the Egyptian gateways (Paymob/Vodafone Cash/Instapay/
 * Kasher) are stubs behind the same shape until real credentials + verified
 * API docs are available - see stub.provider.ts. */
export interface PaymentProvider {
  readonly name: PaymentProviderName;
  createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult>;
  verifyWebhookSignature(rawBody: string, headers: Headers): boolean;
  parseWebhookEvent(rawBody: string): ParsedWebhookEvent | null;
  refund(params: { providerPaymentId: string; amountCents: number }): Promise<RefundResult>;
}
