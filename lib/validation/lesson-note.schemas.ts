import { z } from "zod";

export const createLessonNoteSchema = z.object({
  timestamp_seconds: z.number().int().min(0),
  content: z.string().trim().min(1, "النوتة مطلوبة").max(2000, "النوتة طويلة جداً"),
});
export type CreateLessonNoteInput = z.infer<typeof createLessonNoteSchema>;

export const updateLessonNoteSchema = z.object({
  content: z.string().trim().min(1, "النوتة مطلوبة").max(2000, "النوتة طويلة جداً"),
});
export type UpdateLessonNoteInput = z.infer<typeof updateLessonNoteSchema>;
