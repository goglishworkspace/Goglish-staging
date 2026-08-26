-- Phase 7: Academic Calendar (Section 15 - "Lessons Release, Live Sessions,
-- Quizzes, Exams, Announcements" + "نشر تلقائي للمحتوى وفق التقويم").
-- target_table is deliberately restricted to a fixed CHECK list (not free
-- text) so the auto-publish cron function can use a plain CASE instead of
-- dynamic SQL - see 20260730140008_academic_calendar_cron.sql.
create table public.academic_calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null check (
    event_type in ('lesson_release', 'live_session', 'quiz', 'exam', 'announcement')
  ),
  scheduled_at timestamptz not null,
  target_table text check (target_table in ('lessons', 'quizzes', 'exams')),
  target_id uuid,
  auto_publish boolean not null default false,
  published_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (target_table is null or target_id is not null)
);

create index academic_calendar_events_scheduled_at_idx on public.academic_calendar_events(scheduled_at);

alter table public.academic_calendar_events enable row level security;

create policy "academic_calendar_events_public_read" on public.academic_calendar_events
  for select to anon, authenticated using (true);

create policy "academic_calendar_events_manage" on public.academic_calendar_events
  for all to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'content_manager'))
  with check (public.user_has_any_role('admin', 'super_admin', 'content_manager'));
