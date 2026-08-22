-- Daffaa (github.com/mashroecom/daffaa-sdks): a temporary, additional
-- payment gateway alongside Kashier - see lib/payments/daffaa.provider.ts.
-- payments.provider's check constraint (20260727110004_orders_payments.sql)
-- predates this gateway, so every insert with provider = 'daffaa' would be
-- rejected without widening it.
alter table public.payments drop constraint payments_provider_check;
alter table public.payments add constraint payments_provider_check
  check (provider in ('stripe', 'paymob', 'vodafone_cash', 'instapay', 'kasher', 'daffaa'));
