-- Phase 1: Postgres-based rate limiting (Section 0 / Section 22 - no Redis)
create table public.rate_limit_counters (
  key text not null,
  window_start timestamptz not null,
  count int not null default 1,
  primary key (key, window_start)
);

-- Fixed-window counter check. Returns true when the request is allowed
-- (i.e. the counter for the current window is still within p_max_count).
create or replace function public.check_rate_limit(
  p_key text,
  p_max_count int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count int;
begin
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limit_counters (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start)
  do update set count = public.rate_limit_counters.count + 1
  returning count into v_count;

  return v_count <= p_max_count;
end;
$$;

revoke all on function public.check_rate_limit(text, int, int) from public;
grant execute on function public.check_rate_limit(text, int, int) to service_role;
