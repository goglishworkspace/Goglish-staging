-- Phase 3: atomic XP award (ledger insert + total increment in one
-- transaction, avoids a read-then-write race if a user could somehow trigger
-- two awards concurrently).
create or replace function public.award_xp(
  p_user_id uuid,
  p_amount int,
  p_reason text,
  p_source_type text,
  p_source_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.xp_transactions (user_id, amount, reason, source_type, source_id)
  values (p_user_id, p_amount, p_reason, p_source_type, p_source_id);

  update public.profiles set xp_total = xp_total + p_amount where id = p_user_id;
end;
$$;

revoke all on function public.award_xp(uuid, int, text, text, uuid) from public, anon, authenticated;
grant execute on function public.award_xp(uuid, int, text, text, uuid) to service_role;
