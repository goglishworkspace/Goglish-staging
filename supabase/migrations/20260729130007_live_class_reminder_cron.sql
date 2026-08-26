-- Phase 6: live class reminders (Section 14 - "Reminder قبل الجلسة"). Unlike
-- the leaderboard refresh (Phase 5, pure SQL), sending a reminder needs
-- dispatchNotification() + notification_preferences logic that lives in
-- Next.js - same "API Route Service over Edge Function" reasoning as the
-- payment reconciliation job (Phase 4), so this calls out over pg_net.
select cron.schedule(
  'live-class-reminders-10min',
  '*/10 * * * *',
  $cron$
  select net.http_post(
    url := coalesce(current_setting('app.live_class_reminder_url', true), 'http://host.docker.internal:3000/api/live-classes/reminders'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-live-class-reminder-secret', coalesce(current_setting('app.live_class_reminder_secret', true), 'local-dev-live-class-reminder-secret')
    ),
    body := '{}'::jsonb
  );
  $cron$
);
