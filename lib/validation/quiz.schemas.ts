import { z } from "zod";

export const createQuizSchema = z.object({
  lesson_id: z.uuid("lesson_id غير صالح"),
  kind: z.enum(["quiz"]).optional(),
  title: z.string().trim().min(1, "العنوان مطلوب"),
  max_attempts: z.number().int().min(1).optional(),
  time_limit_seconds: z.number().int().min(1).optional(),
  passing_score_percent: z.number().int().min(0).max(100).optional(),
  shuffle_questions: z.boolean().optional(),
  shuffle_options: z.boolean().optional(),
  xp_reward: z.number().int().min(0).optional(),
  coin_reward: z.number().int().min(0).optional(),
});
export type CreateQuizInput = z.infer<typeof createQuizSchema>;

export const updateQuizSchema = createQuizSchema.partial().extend({
  status: z.enum(["draft", "published"]).optional(),
});
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
