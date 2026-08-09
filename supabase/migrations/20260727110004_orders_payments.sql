-- Phase 4: orders (what's being purchased + the financial breakdown) and
-- payments (individual payment attempts against an order - the actual
-- PENDING -> PROCESSING -> COMPLETED/FAILED -> RETRYING state machine).
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('course', 'bundle', 'subscription_plan')),
  item_id uuid not null,
  coupon_id uuid references public.coupons(id),
  subtotal_cents int not null,
  discount_cents int not null default 0,
  tax_cents int not null default 0,
  total_cents int not null,
  currency text not null default 'EGP',
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger orders_set_updated_at
  before update on public.orders
  for each row
  execute function public.set_updated_at();

create index orders_user_id_idx on public.orders(user_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null check (provider in ('stripe', 'paymob', 'vodafone_cash', 'instapay', 'kasher')),
  provider_payment_id text,
  idempotency_key text not null unique,
  attempt_number int not null default 1,
  status text not null default 'pending' check (
    status in ('pending', 'processing', 'completed', 'failed', 'retrying', 'cancelled')
  ),
  failure_reason text,
  amount_cents int not null,
  currency text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create trigger payments_set_updated_at
  before update on public.payments
  for each row
  execute function public.set_updated_at();

create index payments_order_id_idx on public.payments(order_id);
create index payments_status_idx on public.payments(status);

-- Raw webhook log: idempotency (unique per provider+event) and the retry
-- queue the reconciliation job drains (Section 9 - Webhook Handler + Retry
-- Logic).
create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  provider_payment_id text not null,
  status text not null check (status in ('completed', 'failed')),
  payload jsonb not null,
  processed boolean not null default false,
  retry_count int not null default 0,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)
);

create index payment_webhook_events_unprocessed_idx
  on public.payment_webhook_events(next_retry_at)
  where not processed;
