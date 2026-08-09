-- Phase 4: invoices (PDF, private Storage bucket - same pattern as
-- lesson_resources/certificates) and refunds (admin-processed only,
-- Section 9 - "Refund يُعالَج من الأدمن").
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_number text not null unique,
  storage_path text not null,
  subtotal_cents int not null,
  discount_cents int not null,
  tax_cents int not null,
  total_cents int not null,
  issued_at timestamptz not null default now()
);

create index invoices_user_id_idx on public.invoices(user_id);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id),
  order_id uuid not null references public.orders(id),
  amount_cents int not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  processed_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index refunds_order_id_idx on public.refunds(order_id);
