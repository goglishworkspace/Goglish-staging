-- Phase 5: Coins ledger - identical shape/trust model to xp_transactions
-- (Phase 3), written only via award_gamification_rewards (service_role).
create table public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount int not null,
  reason text not null,
  source_type text not null check (source_type in ('quiz', 'exam', 'streak', 'weekly_challenge')),
  source_id uuid,
  created_at timestamptz not null default now()
);

create index coin_transactions_user_id_idx on public.coin_transactions(user_id);

alter table public.coin_transactions enable row level security;

create policy "coin_transactions_owner_read" on public.coin_transactions
  for select to authenticated
  using (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'support'));
