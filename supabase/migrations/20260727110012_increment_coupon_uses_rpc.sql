-- Phase 4: atomic coupon usage counter (avoids a read-then-write race, same
-- reasoning as award_xp in Phase 3).
create or replace function public.increment_coupon_uses(p_coupon_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.coupons set uses_count = uses_count + 1 where id = p_coupon_id;
$$;

revoke all on function public.increment_coupon_uses(uuid) from public, anon, authenticated;
grant execute on function public.increment_coupon_uses(uuid) to service_role;
