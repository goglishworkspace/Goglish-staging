import { describe, it, expect, afterAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserRegistry } from "./cleanup";
import { createPricedCourse } from "./phase4-fixtures";
import { calculateOrderPricing, CouponError } from "@/lib/services/pricing.service";

const TAX_RATE_PERCENT = Number(process.env.TAX_RATE_PERCENT ?? 14);

describe("calculateOrderPricing", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("computes subtotal + tax with no coupon", async () => {
    const { admin, teacher, courseId } = await createPricedCourse(10000);
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const pricing = await calculateOrderPricing("course", courseId, null);
    expect(pricing.subtotalCents).toBe(10000);
    expect(pricing.discountCents).toBe(0);
    expect(pricing.taxCents).toBe(Math.round((10000 * TAX_RATE_PERCENT) / 100));
    expect(pricing.totalCents).toBe(pricing.subtotalCents + pricing.taxCents);
    expect(pricing.couponId).toBeNull();
  });

  it("applies a percent coupon before computing tax", async () => {
    const { admin, teacher, courseId } = await createPricedCourse(10000);
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const supabase = createAdminClient();
    const code = `PCT-${Date.now()}`;
    const { data: coupon } = await supabase
      .from("coupons")
      .insert({ code, discount_type: "percent", discount_value: 20 })
      .select("id")
      .single();

    const pricing = await calculateOrderPricing("course", courseId, code);
    // discount = 20% of 10000 = 2000; taxable = 8000; tax = 8000 * rate
    expect(pricing.discountCents).toBe(2000);
    const expectedTax = Math.round((8000 * TAX_RATE_PERCENT) / 100);
    expect(pricing.taxCents).toBe(expectedTax);
    expect(pricing.totalCents).toBe(8000 + expectedTax);
    expect(pricing.couponId).toBe(coupon!.id);
  });

  it("applies a fixed coupon capped at the subtotal", async () => {
    const { admin, teacher, courseId } = await createPricedCourse(1000);
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const supabase = createAdminClient();
    const code = `FIXED-${Date.now()}`;
    await supabase.from("coupons").insert({ code, discount_type: "fixed", discount_value: 5000 });

    const pricing = await calculateOrderPricing("course", courseId, code);
    expect(pricing.discountCents).toBe(1000); // capped, never negative taxable amount
    expect(pricing.totalCents).toBe(0);
  });

  it("applies free_course only to its own target course", async () => {
    const { admin, teacher, courseId } = await createPricedCourse(5000);
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const other = await createPricedCourse(5000);
    registry.track(other.admin.userId);
    registry.track(other.teacher.userId);

    const supabase = createAdminClient();
    const code = `FREE-${Date.now()}`;
    await supabase
      .from("coupons")
      .insert({ code, discount_type: "free_course", discount_value: 0, applies_to_item_id: courseId });

    const pricing = await calculateOrderPricing("course", courseId, code);
    expect(pricing.discountCents).toBe(5000);
    expect(pricing.totalCents).toBe(0);

    await expect(calculateOrderPricing("course", other.courseId, code)).rejects.toThrow(CouponError);
  });

  it("rejects an expired coupon", async () => {
    const { admin, teacher, courseId } = await createPricedCourse(5000);
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const supabase = createAdminClient();
    const code = `EXPIRED-${Date.now()}`;
    await supabase.from("coupons").insert({
      code,
      discount_type: "fixed",
      discount_value: 1000,
      expires_at: new Date(Date.now() - 60_000).toISOString(),
    });

    await expect(calculateOrderPricing("course", courseId, code)).rejects.toThrow(CouponError);
  });

  it("rejects a coupon that hit its max_uses", async () => {
    const { admin, teacher, courseId } = await createPricedCourse(5000);
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const supabase = createAdminClient();
    const code = `MAXED-${Date.now()}`;
    await supabase
      .from("coupons")
      .insert({ code, discount_type: "fixed", discount_value: 1000, max_uses: 1, uses_count: 1 });

    await expect(calculateOrderPricing("course", courseId, code)).rejects.toThrow(CouponError);
  });

  it("rejects a coupon below its min_purchase_cents", async () => {
    const { admin, teacher, courseId } = await createPricedCourse(500);
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const supabase = createAdminClient();
    const code = `MINPURCHASE-${Date.now()}`;
    await supabase
      .from("coupons")
      .insert({ code, discount_type: "fixed", discount_value: 100, min_purchase_cents: 1000 });

    await expect(calculateOrderPricing("course", courseId, code)).rejects.toThrow(CouponError);
  });

  it("rejects an unknown coupon code and an unavailable item", async () => {
    const { admin, teacher, courseId } = await createPricedCourse(5000);
    registry.track(admin.userId);
    registry.track(teacher.userId);

    await expect(calculateOrderPricing("course", courseId, "NOPE-DOES-NOT-EXIST")).rejects.toThrow(
      CouponError,
    );
    await expect(
      calculateOrderPricing("course", "00000000-0000-0000-0000-000000000000", null),
    ).rejects.toThrow(CouponError);
  });
});
