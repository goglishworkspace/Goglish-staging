-- Phase 5: Daily Streak (Section 10 - "تتبع أيام الدراسة المتتالية").
-- Idempotent per calendar day (UTC) - called from every real study-activity
-- write path (lesson progress ping, quiz submit, exam submit/leave), a
-- second call on the same day is a harmless no-op. Awards a flat XP+coin
-- bonus each day the streak actually advances.
create or replace function public.record_daily_activity(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last date;
  v_current_streak int;
  v_today date := (now() at time zone 'utc')::date;
  v_new_streak int;
begin
  select last_activity_date, current_streak_days
  into v_last, v_current_streak
  from public.profiles
  where id = p_user_id;

  if v_last = v_today then
    return;
  elsif v_last = v_today - 1 then
    v_new_streak := coalesce(v_current_streak, 0) + 1;
  else
    v_new_streak := 1;
  end if;

  update public.profiles
  set last_activity_date = v_today,
      current_streak_days = v_new_streak,
      longest_streak_days = greatest(longest_streak_days, v_new_streak)
  where id = p_user_id;

  perform public.award_gamification_rewards(p_user_id, 5, 2, 'daily_streak', 'streak', null);
end;
$$;

revoke all on function public.record_daily_activity(uuid) from public, anon, authenticated;
grant execute on function public.record_daily_activity(uuid) to service_role;
