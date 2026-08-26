import { z } from "zod";

export const createCouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "الكود لازم يكون 3 أحرف على الأقل")
      .transform((v) => v.toUpperCase()),
    discount_type: z.enum(["percent", "fixed", "free_course", "free_bundle"]),
    discount_value: z.number().min(0).optional(),
    applies_to_item_id: z.uuid().optional(),
    max_uses: z.number().int().min(1).optional(),
    min_purchase_cents: z.number().int().min(0).optional(),
    expires_at: z.iso.datetime().optional(),
  })
  .superRefine((data, ctx) => {
    if ((data.discount_type === "free_course" || data.discount_type === "free_bundle") && !data.applies_to_item_id) {
      ctx.addIssue({
        code: "custom",
        message: "applies_to_item_id مطلوب للكوبونات المجانية",
        path: ["applies_to_item_id"],
      });
    }
    if (
      (data.discount_type === "percent" || data.discount_type === "fixed") &&
      (data.discount_value === undefined || data.discount_value <= 0)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "discount_value مطلوب وأكبر من صفر",
        path: ["discount_value"],
      });
    }
  });
export type CreateCouponInput = z.infer<typeof createCouponSchema>;

export const updateCouponSchema = z.object({
  discount_value: z.number().min(0).optional(),
  max_uses: z.number().int().min(1).optional(),
  min_purchase_cents: z.number().int().min(0).optional(),
  expires_at: z.iso.datetime().optional(),
  is_active: z.boolean().optional(),
});
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;

export const validateCouponSchema = z.object({
  code: z.string().trim().min(1, "الكود مطلوب"),
  item_type: z.enum(["course", "bundle", "subscription_plan"]),
  item_id: z.uuid(),
});
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
