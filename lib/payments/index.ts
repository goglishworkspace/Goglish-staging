import "server-only";
import type { PaymentProvider, PaymentProviderName } from "./types";
import { StripeProvider } from "./stripe.provider";
import { StubPaymentProvider } from "./stub.provider";

export * from "./types";

const providers: Partial<Record<PaymentProviderName, PaymentProvider>> = {
  stripe: new StripeProvider(),
};

// Egyptian-gateway stubs (Paymob/Vodafone Cash/Instapay/Kasher) can't actually
// process a real payment - only register them when a developer/test run has
// explicitly opted in, so they're never selectable in production regardless
// of what a request sends as `provider`.
if (process.env.NODE_ENV !== "production" && process.env.ENABLE_MOCK_PAYMENTS === "true") {
  providers.paymob = new StubPaymentProvider("paymob", "PAYMOB_HMAC_SECRET");
  providers.vodafone_cash = new StubPaymentProvider("vodafone_cash", "VODAFONE_CASH_HMAC_SECRET");
  providers.instapay = new StubPaymentProvider("instapay", "INSTAPAY_HMAC_SECRET");
  providers.kasher = new StubPaymentProvider("kasher", "KASHER_HMAC_SECRET");
}

export function getPaymentProvider(name: PaymentProviderName): PaymentProvider | undefined {
  return providers[name];
}

export function isPaymentProviderName(value: string): value is PaymentProviderName {
  return value in providers;
}
