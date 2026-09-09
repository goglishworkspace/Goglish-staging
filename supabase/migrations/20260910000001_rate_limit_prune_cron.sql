-- Hourly pruning cron for rate limit counters
-- Prevents table unbounded growth by removing entries older than 2 hours
select cron.schedule(
  'rate-limit-counters-prune-hourly',
  '0 * * * *',
  $$delete from public.rate_limit_counters where window_start < now() - interval '2 hours';$$
);
