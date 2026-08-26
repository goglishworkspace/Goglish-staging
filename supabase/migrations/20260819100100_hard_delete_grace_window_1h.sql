-- Section 23 - shortened the hard-delete grace period from 30 days to 1
-- hour (HARD_DELETE_AFTER_HOURS in admin-user-management.service.ts): with
-- no restore action anywhere in the app, a 30-day "recovery window" nobody
-- could actually use was decorative, not a real safety net. A short window
-- plus a real restore endpoint (added alongside this) is an undo you can
-- actually use, not a number that just delays the same one-way door.
--
-- A once-a-day cron can't serve a 1-hour window - re-scheduled under a new
-- name that reflects what it actually does now (the old
-- 'user-hard-delete-daily' name would be actively misleading left as-is).
select cron.unschedule('user-hard-delete-daily');

select cron.schedule(
  'user-hard-delete-poll',
  '*/10 * * * *',
  $cron$
  select net.http_post(
    url := coalesce(current_setting('app.user_hard_delete_url', true), 'http://host.docker.internal:3000/api/admin/users/hard-delete-due'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-user-hard-delete-secret', coalesce(current_setting('app.user_hard_delete_secret', true), 'local-dev-user-hard-delete-secret')
    ),
    body := '{}'::jsonb
  );
  $cron$
);
