import { z } from "zod";

const slug = z
  .string()
  .trim()
  .min(1, "الـ slug مطلوب")
  .regex(/^[a-z0-9-]+$/, "الـ slug يسمح بحروف إنجليزية صغيرة وأرقام وشرطة بس");

export const createCourseSchema = z.object({
  subject_id: z.uuid("subject_id غير صالح"),
  title: z.string().trim().min(1, "العنوان مطلوب"),
  slug,
  description: z.string().trim().optional(),
  cover_image_url: z
    .string()
    .url("رابط الصورة غير صالح")
    .refine((url) => url.startsWith("https://") || url.startsWith("http://"), {
      message: "يجب أن يكون رابطاً صحيحاً يبدأ بـ http أو https",
    })
    .optional(),
  price_cents: z.number().int().min(0).optional(),
  currency: z.string().trim().length(3).optional(),
  trailer_youtube_id: z.string().trim().min(1).optional(),
});
export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = createCourseSchema.partial();
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

export const assignCourseTeacherSchema = z.object({
  teacher_id: z.uuid("teacher_id غير صالح"),
});
export type AssignCourseTeacherInput = z.infer<typeof assignCourseTeacherSchema>;
