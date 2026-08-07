import { z } from "zod";

export const createLessonSchema = z.object({
  title: z.string().trim().min(1, "العنوان مطلوب"),
  description: z.string().trim().optional(),
  order_index: z.number().int().min(0),
  teacher_id: z.uuid("teacher_id غير صالح").optional(),
  bunny_video_id: z.string().trim().optional(),
  bunny_video_duration_seconds: z.number().int().min(0).optional(),
  youtube_video_id: z.string().trim().optional(),
  youtube_preview_video_id: z.string().trim().optional(),
  is_preview: z.boolean().optional(),
});
export type CreateLessonInput = z.infer<typeof createLessonSchema>;

export const updateLessonSchema = createLessonSchema.partial();
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
