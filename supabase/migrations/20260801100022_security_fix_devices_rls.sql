REVOKE UPDATE, DELETE ON public.devices FROM authenticated;
DROP POLICY IF EXISTS "devices_update_own_or_admin" ON public.devices;
