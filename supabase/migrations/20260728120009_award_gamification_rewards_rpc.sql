-- Phase 5: unified XP+Coins award (replaces award_xp from Phase 3 as the
-- entry point application code uses going forward - award_xp itself is left
-- untouched since its migration already shipped). Resolves subject_id from
-- the quiz/exam's course in SQL so xp.service.ts doesn't need extra
-- round-trips, and awards both ledgers atomically in one transaction.
create or replace function public.award_gamification_rewards(
  p_user_id uuid,
  p_xp_amount int,
  p_coin_amount int,
  p_reason text,
  p_source_type text,
  p_source_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subject_id uuid;
begin
  if p_source_type = 'exam' then
    select c.subject_id into v_subject_id
    from public.exams e
    join public.courses c on c.id = e.course_id
    where e.id = p_source_id;
  elsif p_source_type = 'quiz' then
    select c.subject_id into v_subject_id
    from public.quizzes q
    join public.lessons l on l.id = q.lesson_id
    join public.modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where q.id = p_source_id;
  end if;

  if p_xp_amount > 0 then
    insert into public.xp_transactions (user_id, amount, reason, source_type, source_id, subject_id)
    values (p_user_id, p_xp_amount, p_reason, p_source_type, p_source_id, v_subject_id);

    update public.profiles set xp_total = xp_total + p_xp_amount where id = p_user_id;
  end if;

  if p_coin_amount > 0 then
    insert into public.coin_transactions (user_id, amount, reason, source_type, source_id)
    values (p_user_id, p_coin_amount, p_reason, p_source_type, p_source_id);

    update public.profiles set coins_total = coins_total + p_coin_amount where id = p_user_id;
  end if;
end;
$$;

revoke all on function public.award_gamification_rewards(uuid, int, int, text, text, uuid) from public, anon, authenticated;
grant execute on function public.award_gamification_rewards(uuid, int, int, text, text, uuid) to service_role;
