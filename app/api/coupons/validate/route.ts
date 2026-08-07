import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { validateCouponSchema } from "@/lib/validation/coupon.schemas";
import { calculateOrderPricing, CouponError } from "@/lib/services/pricing.service";

/** Returns only the computed discount preview, never the raw coupon row -
 * `coupons` isn't publicly SELECT-able (Section 4), this is the only way a
 * student can check a code. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = validateCouponSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  try {
    const pricing = await calculateOrderPricing(parsed.data.item_type, parsed.data.item_id, parsed.data.code);
    return apiSuccess(
      {
        subtotal_cents: pricing.subtotalCents,
        discount_cents: pricing.discountCents,
        tax_cents: pricing.taxCents,
        total_cents: pricing.totalCents,
        currency: pricing.currency,
      },
      "الكوبون صالح",
    );
  } catch (error) {
    if (error instanceof CouponError) return apiError(error.message, null, 422);
    throw error;
  }
}
