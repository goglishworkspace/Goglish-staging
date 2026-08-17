-- Login rate limiting is being split into two counters (Section 0/22):
-- a loose per-IP counter (any request, existing behavior, just a higher
-- ceiling) for scripted-abuse protection, and a strict per-IP+email counter
-- (real brute-force protection) that this function resets the moment a
-- login actually succeeds - so a correct password never leaves a stray
-- charge that throttles that same account's *next* legitimate login.
create or replace function public.reset_rate_limit(p_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.rate_limit_counters where key = p_key;
end;
$$;

revoke all on function public.reset_rate_limit(text) from public;
grant execute on function public.reset_rate_limit(text) to service_role;
