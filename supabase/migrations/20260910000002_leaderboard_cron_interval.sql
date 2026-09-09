-- Adjust leaderboard refresh cron interval from every 5 minutes to every 30 minutes
-- Reduces heavy XP transaction aggregations by 83%
select cron.unschedule('leaderboard-refresh-5min');

select cron.schedule(
  'leaderboard-refresh-30min',
  '*/30 * * * *',
  'select public.refresh_leaderboard_cache();'
);
