import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOrderSchema } from "@/lib/validation/order.schemas";
import { calculateOrderPricing, CouponError } from "@/lib/services/pricing.service";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  let pricing;
  try {
    pricing = await calculateOrderPricing(
      parsed.data.item_type,
      parsed.data.item_id,
      parsed.data.coupon_code ?? null,
    );
  } catch (error) {
    if (error instanceof CouponError) return apiError(error.message, null, 422);
    throw error;
  }

  // authenticated no longer has INSERT on orders (see the RLS revoke in
  // supabase/migrations/20260801100018_security_fix_orders_rls.sql) - all
  // pricing above is computed server-side, so this is the trusted write path.
  const admin = createAdminClient();

  if (pricing.couponId) {
    // calculateOrderPricing's max_uses/expiry check above is a plain read -
    // two concurrent requests could both pass it before either order exists,
    // over-redeeming a max_uses coupon. This RPC does the check-and-increment
    // as a single atomic UPDATE (supabase/migrations/20260801100019_security_fix_coupon_atomic.sql),
    // so only as many callers as there are remaining uses can ever win.
    const { data: reserved, error: reserveError } = await admin.rpc("reserve_coupon_use", {
      p_coupon_id: pricing.couponId,
    });
    if (reserveError) return apiError("تعذر التحقق من الكوبون", null, 500);
    if (!reserved) return apiError("الكوبون وصل للحد الأقصى من الاستخدام", null, 422);
  }

  const { data: order, error } = await admin
    .from("orders")
    .insert({
      user_id: user.id,
      item_type: parsed.data.item_type,
      item_id: parsed.data.item_id,
      coupon_id: pricing.couponId,
      subtotal_cents: pricing.subtotalCents,
      discount_cents: pricing.discountCents,
      tax_cents: pricing.taxCents,
      total_cents: pricing.totalCents,
      currency: pricing.currency,
    })
    .select()
    .single();
  if (error) return apiError("تعذر إنشاء الطلب", null, 500);

  return apiSuccess(order, "تم إنشاء الطلب", 201);
}
