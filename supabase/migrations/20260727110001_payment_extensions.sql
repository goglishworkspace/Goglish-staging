-- Phase 4: extensions needed for the hourly reconciliation job.
-- Each installs into its own conventional schema (cron / net) rather than a
-- forced one, matching how Supabase ships them.
create extension if not exists pg_cron;
create extension if not exists pg_net;
