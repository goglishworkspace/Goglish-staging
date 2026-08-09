-- Revoke direct client insert on orders (price manipulation fix)
-- All order creation must go through the service-role API route
REVOKE INSERT ON public.orders FROM authenticated;
DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
