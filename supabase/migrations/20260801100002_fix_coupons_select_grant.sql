-- Fix: 20260727110009_payment_grants.sql granted insert/update/delete on
-- coupons to `authenticated` but never granted select - RLS policy
-- coupons_manage_admin (admin/super_admin/content_manager) was correctly
-- permissive, but Postgres denies the query before RLS is even evaluated
-- when the base GRANT is missing, so GET /api/coupons 500'd for every
-- caller regardless of role ("permission denied for table coupons").
-- Deliberately not granted to anon - coupon codes shouldn't be publicly
-- listable (only checked one-at-a-time via /api/coupons/validate).
grant select on public.coupons to authenticated;
