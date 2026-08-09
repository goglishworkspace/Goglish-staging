-- Phase 6: per-user comment moderation state (Section 11 - the 3-strike
-- warning system + manual admin ban). Same trust model as xp_total/coins_total
-- (Phase 3/5): only ever written by service-role code, never granted to
-- `authenticated` directly.
alter table public.profiles
  add column comment_warning_count int not null default 0,
  add column comment_suspended_until timestamptz,
  add column comment_banned boolean not null default false,
  add column comment_ban_reason text;
