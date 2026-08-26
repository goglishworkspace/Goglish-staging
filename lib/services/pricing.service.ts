import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type OrderItemType = "course" | "bundle" | "subscription_plan";

export type PricingResult = {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  couponId: string | null;
};

export class CouponError extends Error {}

const ITEM_TABLE: Record<OrderItemType, string> = {
  course: "courses",
  bundle: "course_bundles",
  subscription_plan: "subscription_plans",
};

function isItemAvailable(itemType: OrderItemType, row: Record<string, unknown>): boolean {
  if (itemType === "course") return row.status === "published";
  return row.is_active !== false;
}

function getTaxRatePercent(): number {
  const raw = process.env.TAX_RATE_PERCENT;
  const parsed = raw ? Number(raw) : 14;
  return Number.isFinite(parsed) ? parsed : 14;
}

/**
 * Computes subtotal/discount/tax/total for a purchase, applying + validating
 * a coupon if given (Section 3 coupon rules: expiry, max uses, min purchase,
 * free_course/free_bundle only applies to its own target item). Uses the
 * admin client internally - `coupons` isn't publicly readable (Section 4:
 * codes shouldn't be enumerable), and this always runs server-side from the
 * order-creation route, never exposed directly to a lower-trust caller.
 */
export async function calculateOrderPricing(
  itemType: OrderItemType,
  itemId: string,
  couponCode: string | null,
): Promise<PricingResult> {
  const admin = createAdminClient();

  // Selecting "*" (rather than a dynamic column-list string built per table)
  // deliberately avoids supabase-js's select-string type parser, which can't
  // handle a runtime-computed column name.
  const { data: itemRow, error: itemError } = await admin
    .from(ITEM_TABLE[itemType])
    .select("*")
    .eq("id", itemId)
    .maybeSingle();
  const item = itemRow as Record<string, unknown> | null;
  if (itemError || !item || !isItemAvailable(itemType, item)) {
    throw new CouponError("العنصر المطلوب شراؤه غير موجود أو غير متاح");
  }

  const subtotalCents = item.price_cents as number;
  let discountCents = 0;
  let couponId: string | null = null;

  if (couponCode) {
    const { data: coupon, error: couponError } = await admin
      .from("coupons")
      .select("*")
      .eq("code", couponCode.toUpperCase())
      .eq("is_active", true)
      .maybeSingle();
    if (couponError || !coupon) throw new CouponError("كود الكوبون غير صالح");

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      throw new CouponError("الكوبون منتهي الصلاحية");
    }
    if (coupon.max_uses != null && coupon.uses_count >= coupon.max_uses) {
      throw new CouponError("الكوبون وصل للحد الأقصى من الاستخدام");
    }
    if (coupon.min_purchase_cents != null && subtotalCents < coupon.min_purchase_cents) {
      throw new CouponError("قيمة الطلب أقل من الحد الأدنى لاستخدام الكوبون");
    }

    if (coupon.discount_type === "percent") {
      discountCents = Math.round((subtotalCents * Number(coupon.discount_value)) / 100);
    } else if (coupon.discount_type === "fixed") {
      discountCents = Math.min(Math.round(Number(coupon.discount_value)), subtotalCents);
    } else if (coupon.discount_type === "free_course" || coupon.discount_type === "free_bundle") {
      if (coupon.applies_to_item_id !== itemId) {
        throw new CouponError("الكوبون ده مش صالح للمنتج ده");
      }
      discountCents = subtotalCents;
    }
    couponId = coupon.id as string;
  }

  const taxableCents = Math.max(subtotalCents - discountCents, 0);
  const taxCents = Math.round((taxableCents * getTaxRatePercent()) / 100);
  const totalCents = taxableCents + taxCents;

  return {
    subtotalCents,
    discountCents,
    taxCents,
    totalCents,
    currency: (item.currency as string) ?? "EGP",
    couponId,
  };
}
