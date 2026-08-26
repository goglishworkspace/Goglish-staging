-- Phase 4: coupons (Section 3 - discount / free course / free bundle, usage
-- caps, expiry, minimum purchase).
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent', 'fixed', 'free_course', 'free_bundle')),
  discount_value numeric not null default 0,
  applies_to_item_id uuid,
  max_uses int,
  uses_count int not null default 0,
  min_purchase_cents int,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index coupons_code_idx on public.coupons(code);
