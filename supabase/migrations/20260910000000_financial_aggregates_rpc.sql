-- RPC functions for financial aggregates in admin dashboard
-- Replaces client-side Array.reduce() with PostgreSQL native aggregation
create or replace function public.get_admin_financial_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_revenue bigint;
begin
  select coalesce(sum(total_cents), 0)
  into v_revenue
  from public.orders
  where status = 'completed';

  return jsonb_build_object('total_revenue_cents', v_revenue);
end;
$$;

revoke all on function public.get_admin_financial_stats() from public, anon, authenticated;
grant execute on function public.get_admin_financial_stats() to service_role;
