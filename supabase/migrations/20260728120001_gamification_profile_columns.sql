-- Phase 5: gamification columns on profiles (Section 10 - Coins, Levels,
-- Daily Streak). Same trust model as xp_total (Phase 3): these are only ever
-- written by service-role code (streak.service.ts / xp.service.ts via the
-- award_gamification_rewards / record_daily_activity RPCs below), never
-- granted to `authenticated` - a student could otherwise PATCH their own
-- coins/streak directly via the Supabase REST API.
alter table public.profiles
  add column coins_total int not null default 0,
  add column current_streak_days int not null default 0,
  add column longest_streak_days int not null default 0,
  add column last_activity_date date;
