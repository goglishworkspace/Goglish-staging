import { z } from "zod";

export const createModuleSchema = z.object({
  title: z.string().trim().min(1, "العنوان مطلوب"),
  order_index: z.number().int().min(0),
  teacher_id: z.uuid("teacher_id غير صالح").optional(),
});
export type CreateModuleInput = z.infer<typeof createModuleSchema>;

export const updateModuleSchema = createModuleSchema.partial();
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
