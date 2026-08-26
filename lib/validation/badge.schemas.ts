import { z } from "zod";

export const createBadgeSchema = z.object({
  code: z.string().trim().min(1, "الكود مطلوب").toLowerCase(),
  title: z.string().trim().min(1, "العنوان مطلوب"),
  description: z.string().trim().min(1, "الوصف مطلوب"),
  icon: z.string().trim().min(1, "الأيقونة مطلوبة"),
  criteria_type: z.enum(["xp_total", "streak_days", "level_reached", "quizzes_passed", "exams_passed"]),
  criteria_value: z.number().int().min(1),
});
export type CreateBadgeInput = z.infer<typeof createBadgeSchema>;

export const updateBadgeSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  icon: z.string().trim().min(1).optional(),
  criteria_value: z.number().int().min(1).optional(),
  is_active: z.boolean().optional(),
});
export type UpdateBadgeInput = z.infer<typeof updateBadgeSchema>;
