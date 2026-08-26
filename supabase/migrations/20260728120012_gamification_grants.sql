-- Phase 5: base table privileges (RLS alone isn't enough - see
-- 20260724120010_grants.sql for why).

grant select on public.coin_transactions to authenticated;

grant select on public.levels, public.badges, public.weekly_challenges, public.leaderboard_cache
to anon, authenticated;

grant insert, update, delete on public.levels, public.badges, public.weekly_challenges
to authenticated;

grant select on public.user_badges, public.weekly_challenge_completions, public.ranking_history
to authenticated;

grant select, insert, update, delete on
  public.coin_transactions,
  public.levels,
  public.badges,
  public.user_badges,
  public.weekly_challenges,
  public.weekly_challenge_completions,
  public.leaderboard_cache,
  public.ranking_history
to service_role;
