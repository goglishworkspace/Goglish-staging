-- Phase 3: minimal XP foundation (full Gamification is Section 10, a later
-- phase) - just enough for Quiz/Exam "XP يُمنح تلقائياً" (Section 8).
alter table public.profiles add column xp_total int not null default 0;

-- Phase 1's grants gave `authenticated` blanket UPDATE on profiles (needed
-- for the phone-verification columns), which means a student could otherwise
-- PATCH their own xp_total (or national_id_encrypted) directly via the
-- Supabase REST API, bypassing every route in this app. Tighten to only the
-- columns a user's own session client legitimately writes.
revoke update on public.profiles from authenticated;
grant update (
  first_name, last_name, phone, grade,
  phone_verification_code_hash, phone_verification_expires_at,
  phone_verification_attempts, phone_verified_at,
  updated_at
) on public.profiles to authenticated;

create table public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount int not null,
  reason text not null,
  source_type text not null check (source_type in ('quiz', 'exam')),
  source_id uuid not null,
  created_at timestamptz not null default now()
);

create index xp_transactions_user_id_idx on public.xp_transactions(user_id);
