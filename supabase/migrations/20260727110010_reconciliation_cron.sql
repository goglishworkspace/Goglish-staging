-- Phase 4: hourly reconciliation job (Section 9 - "Scheduled Edge Function
-- (pg_cron) تشتغل كل ساعة"). The actual reconciliation logic lives in
-- POST /api/payments/reconcile (an API Route Service, consistent with how
-- the rest of this project avoids real Deno Edge Functions) - pg_cron here
-- is purely the scheduler, calling out over HTTP via pg_net.
--
-- The target URL/secret are read from Postgres GUCs so a cloud environment
-- can override them (`ALTER DATABASE postgres SET app.reconcile_url = '...'`)
-- without editing this migration - NOTE: the local Supabase CLI's `postgres`
-- role doesn't have permission to set custom GUCs itself (verified: both
-- ALTER DATABASE and ALTER ROLE return "permission denied to set parameter"
-- locally), so local dev relies entirely on the hardcoded fallback below,
-- which must match RECONCILE_SECRET in .env.local. A real deployment should
-- confirm its Supabase project role can actually set these GUCs, or wire the
-- secret through Vault/dashboard cron config instead.
select cron.schedule(
  'payment-reconciliation-hourly',
  '0 * * * *',
  $cron$
  select net.http_post(
    url := coalesce(current_setting('app.reconcile_url', true), 'http://host.docker.internal:3000/api/payments/reconcile'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reconcile-secret', coalesce(current_setting('app.reconcile_secret', true), 'local-dev-reconcile-secret')
    ),
    body := '{}'::jsonb
  );
  $cron$
);
