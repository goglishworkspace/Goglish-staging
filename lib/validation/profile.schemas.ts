import { z } from "zod";

export const updateGradeSchema = z.object({
  grade: z.enum(["grade1", "grade2", "grade3"]),
});
export type UpdateGradeInput = z.infer<typeof updateGradeSchema>;

// email is deliberately not a field here - there is no self-service
// email-change path anywhere in the app, and this schema backs the one
// route (PATCH /api/profile) that could otherwise be tempted to add one.
export const updatePersonalInfoSchema = z
  .object({
    first_name: z.string().trim().min(1, "الاسم الأول مطلوب").optional(),
    last_name: z.string().trim().min(1, "الاسم الأخير مطلوب").optional(),
    phone: z.string().trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "مفيش بيانات للتحديث" });
export type UpdatePersonalInfoInput = z.infer<typeof updatePersonalInfoSchema>;
