-- Phase 7: hard-delete users 30 days after soft-delete (Section 23 -
-- "Hard Delete دائم بعد 30 يوم"). Unlike the calendar auto-publish job, this
-- needs Supabase Auth's Admin API (`auth.admin.deleteUser`), which isn't
-- reachable from plain SQL - same "API Route Service over Edge Function"
-- reasoning as payment reconciliation (Phase 4) and live-class reminders
-- (Phase 6), so pg_cron calls out over pg_net to our own route.
select cron.schedule(
  'user-hard-delete-daily',
  '0 3 * * *',
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
