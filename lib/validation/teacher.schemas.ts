import { z } from "zod";

export const createTeacherSchema = z.object({
  user_id: z.uuid("user_id غير صالح"),
  display_name: z.string().trim().min(1, "اسم العرض مطلوب"),
  bio: z.string().trim().optional(),
  photo_url: z
    .string()
    .url("رابط الصورة غير صالح")
    .refine((url) => url.startsWith("https://") || url.startsWith("http://"), {
      message: "يجب أن يكون رابطاً صحيحاً يبدأ بـ http أو https",
    })
    .optional(),
  experience_years: z.number().int().min(0).optional(),
});
export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;

export const updateTeacherProfileSchema = z.object({
  display_name: z.string().trim().min(1).optional(),
  bio: z.string().trim().optional(),
  photo_url: z
    .string()
    .url("رابط الصورة غير صالح")
    .refine((url) => url.startsWith("https://") || url.startsWith("http://"), {
      message: "يجب أن يكون رابطاً صحيحاً يبدأ بـ http أو https",
    })
    .optional(),
  experience_years: z.number().int().min(0).optional(),
});
export type UpdateTeacherProfileInput = z.infer<typeof updateTeacherProfileSchema>;
