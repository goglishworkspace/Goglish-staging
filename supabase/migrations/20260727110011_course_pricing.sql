-- Phase 4: courses had no price in Phase 2 (out of scope then) - needed now
-- for one-time course purchases.
alter table public.courses add column price_cents int not null default 0;
alter table public.courses add column currency text not null default 'EGP';
