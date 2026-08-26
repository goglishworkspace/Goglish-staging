-- A student can change their own name/phone at most once every 30 days
-- (slows down account-sharing/identity churn on top of the national-ID gate
-- added at registration). Tracked separately from the generic `updated_at`
-- (bumped by every write, including system ones like xp/streak) so the
-- cooldown only reacts to the user's own personal-info edits.
alter table public.profiles add column if not exists personal_info_updated_at timestamptz;

-- Additive to the column grant set from 20260726100001_xp_and_profiles.sql
-- (first_name/last_name/phone were already grantable there) - this just adds
-- the new tracking column so the session client can stamp it on self-edit.
-- Note email lives on auth.users, not this table, and no column here or
-- anywhere grants a self-service email change.
grant update (personal_info_updated_at) on public.profiles to authenticated;
