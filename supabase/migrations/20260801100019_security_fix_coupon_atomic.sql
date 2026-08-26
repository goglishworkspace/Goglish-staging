CREATE OR REPLACE FUNCTION public.reserve_coupon_use(p_coupon_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_reserved boolean;
BEGIN
  UPDATE coupons
  SET uses_count = uses_count + 1
  WHERE id = p_coupon_id
    AND is_active = true
    AND (max_uses IS NULL OR uses_count < max_uses)
    AND (expires_at IS NULL OR expires_at > now())
  RETURNING true INTO v_reserved;
  RETURN COALESCE(v_reserved, false);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_coupon_use FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_coupon_use TO service_role;
