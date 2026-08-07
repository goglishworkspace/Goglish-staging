import { z } from "zod";

const slug = z
  .string()
  .trim()
  .min(1, "الـ slug مطلوب")
  .regex(/^[a-z0-9-]+$/, "الـ slug يسمح بحروف إنجليزية صغيرة وأرقام وشرطة بس");

export const createSubjectSchema = z.object({
  grade_id: z.uuid("grade_id غير صالح"),
  name: z.string().trim().min(1, "الاسم مطلوب"),
  slug,
  primary_teacher_id: z.uuid("primary_teacher_id غير صالح").optional(),
});
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

export const updateSubjectSchema = createSubjectSchema.partial();
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
