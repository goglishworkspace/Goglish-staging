-- The subject-scope leaderboard aggregated straight off xp_transactions with
-- no link back to profiles, so a soft-deleted student's per-subject rank
-- never got excluded like the global scope already does (line 22 below,
-- unchanged) - it would linger on /leaderboard?scope=subject forever, not
-- just until the next 5-minute refresh.
create or replace function public.refresh_leaderboard_cache()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.leaderboard_cache where true;

  insert into public.leaderboard_cache (scope, subject_id, user_id, rank, xp)
  select 'global', null, id, row_number() over (order by xp_total desc, id), xp_total
  from public.profiles
  where deleted_at is null and xp_total > 0;

  insert into public.leaderboard_cache (scope, subject_id, user_id, rank, xp)
  select 'subject', subject_id, user_id, row_number() over (partition by subject_id order by subject_xp desc, user_id), subject_xp
  from (
    select xt.subject_id, xt.user_id, sum(xt.amount) as subject_xp
    from public.xp_transactions xt
    join public.profiles p on p.id = xt.user_id
    where xt.subject_id is not null and p.deleted_at is null
    group by xt.subject_id, xt.user_id
  ) subject_totals
  where subject_xp > 0;
end;
$$;
