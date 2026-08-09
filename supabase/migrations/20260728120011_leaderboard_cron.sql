-- Phase 5: leaderboard refresh (Section 10 - "Scheduled Edge Function
-- (pg_cron) تحدّث الـ leaderboard_cache كل 5 دقائق") + a daily ranking
-- snapshot (Section 37 - Ranking History). Unlike the payment reconciliation
-- job (Phase 4), this is pure SQL aggregation with no application logic to
-- reach - pg_cron calls a Postgres function directly, no pg_net/HTTP hop and
-- no secret needed.
create or replace function public.refresh_leaderboard_cache()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- pg-safeupdate (enabled on Supabase Postgres) rejects an unqualified
  -- DELETE, even from inside a function - `where true` satisfies it while
  -- still deleting every row.
  delete from public.leaderboard_cache where true;

  insert into public.leaderboard_cache (scope, subject_id, user_id, rank, xp)
  select 'global', null, id, row_number() over (order by xp_total desc, id), xp_total
  from public.profiles
  where deleted_at is null and xp_total > 0;

  insert into public.leaderboard_cache (scope, subject_id, user_id, rank, xp)
  select 'subject', subject_id, user_id, row_number() over (partition by subject_id order by subject_xp desc, user_id), subject_xp
  from (
    select subject_id, user_id, sum(amount) as subject_xp
    from public.xp_transactions
    where subject_id is not null
    group by subject_id, user_id
  ) subject_totals
  where subject_xp > 0;
end;
$$;

revoke all on function public.refresh_leaderboard_cache() from public, anon, authenticated;
grant execute on function public.refresh_leaderboard_cache() to service_role;

create or replace function public.record_ranking_history()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ranking_history (user_id, scope, subject_id, rank, xp)
  select user_id, scope, subject_id, rank, xp from public.leaderboard_cache;
end;
$$;

revoke all on function public.record_ranking_history() from public, anon, authenticated;
grant execute on function public.record_ranking_history() to service_role;

select cron.schedule(
  'leaderboard-refresh-5min',
  '*/5 * * * *',
  'select public.refresh_leaderboard_cache();'
);

select cron.schedule(
  'ranking-history-daily',
  '0 0 * * *',
  'select public.record_ranking_history();'
);
