import { z } from "zod";

export const createBundleSchema = z.object({
  title: z.string().trim().min(1, "العنوان مطلوب"),
  description: z.string().trim().optional(),
  price_cents: z.number().int().min(0),
  currency: z.string().trim().length(3).optional(),
  course_ids: z.array(z.uuid()).min(1, "لازم كورس واحد على الأقل في الباقة"),
});
export type CreateBundleInput = z.infer<typeof createBundleSchema>;

export const updateBundleSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  price_cents: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  course_ids: z.array(z.uuid()).optional(),
});
export type UpdateBundleInput = z.infer<typeof updateBundleSchema>;
