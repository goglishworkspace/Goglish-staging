-- The Live Classes feature (Phase 6, Section 14 - 20260729130006_live_classes.sql
-- and 20260729130007_live_class_reminder_cron.sql) has been removed from the
-- platform entirely. This tears down its pg_cron job, tables (grants and RLS
-- policies drop automatically with them), leftover settings row, and the
-- now-invalid "live_session" calendar-event type.
select cron.unschedule('live-class-reminders-10min');

drop table if exists public.live_class_questions;
drop table if exists public.live_class_attendance;
drop table if exists public.live_classes;

delete from public.platform_settings where key = 'live_class.reminder_minutes_before';

alter table public.academic_calendar_events drop constraint academic_calendar_events_event_type_check;
alter table public.academic_calendar_events add constraint academic_calendar_events_event_type_check
  check (event_type in ('lesson_release', 'quiz', 'exam', 'announcement'));
