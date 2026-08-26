-- Phase 7: auto-publish scheduled content (Section 15). Pure SQL aggregation
-- over a fixed set of tables - same reasoning as Phase 5's leaderboard
-- refresh (no application logic needed), so pg_cron calls this function
-- directly, no pg_net/HTTP hop.
create or replace function public.publish_due_calendar_events()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.lessons l
  set status = 'published'
  from public.academic_calendar_events e
  where e.target_table = 'lessons'
    and e.target_id = l.id
    and e.auto_publish
    and e.published_at is null
    and e.scheduled_at <= now();

  update public.quizzes q
  set status = 'published'
  from public.academic_calendar_events e
  where e.target_table = 'quizzes'
    and e.target_id = q.id
    and e.auto_publish
    and e.published_at is null
    and e.scheduled_at <= now();

  update public.exams x
  set status = 'published'
  from public.academic_calendar_events e
  where e.target_table = 'exams'
    and e.target_id = x.id
    and e.auto_publish
    and e.published_at is null
    and e.scheduled_at <= now();

  update public.academic_calendar_events
  set published_at = now()
  where auto_publish
    and published_at is null
    and target_table is not null
    and scheduled_at <= now();
end;
$$;

revoke all on function public.publish_due_calendar_events() from public, anon, authenticated;
grant execute on function public.publish_due_calendar_events() to service_role;

select cron.schedule(
  'academic-calendar-auto-publish-5min',
  '*/5 * * * *',
  'select public.publish_due_calendar_events();'
);
