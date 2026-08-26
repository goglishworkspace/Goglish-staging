import { z } from "zod";

export const createPlanSchema = z.object({
  kind: z.enum(["monthly", "term", "yearly", "premium", "family"]),
  name: z.string().trim().min(1, "الاسم مطلوب"),
  price_cents: z.number().int().min(0),
  currency: z.string().trim().length(3).optional(),
  duration_days: z.number().int().min(1),
  includes_parent_tracking: z.boolean().optional(),
  family_seats: z.number().int().min(1).optional(),
});
export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = createPlanSchema.partial().extend({
  is_active: z.boolean().optional(),
});
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
