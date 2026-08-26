import { z } from "zod";

export const createExamSchema = z.object({
  course_id: z.uuid("course_id غير صالح"),
  title: z.string().trim().min(1, "العنوان مطلوب"),
  time_limit_seconds: z.number().int().min(1).optional(),
  passing_score_percent: z.number().int().min(0).max(100).optional(),
  shuffle_questions: z.boolean().optional(),
  solutions_visible_at: z.iso.datetime().optional(),
  xp_reward: z.number().int().min(0).optional(),
  coin_reward: z.number().int().min(0).optional(),
});
export type CreateExamInput = z.infer<typeof createExamSchema>;

export const updateExamSchema = createExamSchema.partial().extend({
  status: z.enum(["draft", "published"]).optional(),
});
export type UpdateExamInput = z.infer<typeof updateExamSchema>;
