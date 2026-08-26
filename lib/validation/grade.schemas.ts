import { z } from "zod";

const slug = z
  .string()
  .trim()
  .min(1, "الـ slug مطلوب")
  .regex(/^[a-z0-9-]+$/, "الـ slug يسمح بحروف إنجليزية صغيرة وأرقام وشرطة بس");

export const createGradeSchema = z.object({
  name: z.string().trim().min(1, "الاسم مطلوب"),
  slug,
  order_index: z.number().int().min(1),
});
export type CreateGradeInput = z.infer<typeof createGradeSchema>;

export const updateGradeSchema = createGradeSchema.partial();
export type UpdateGradeInput = z.infer<typeof updateGradeSchema>;
