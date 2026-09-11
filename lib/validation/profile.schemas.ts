import { z } from "zod";

export const updateGradeSchema = z.object({
  grade: z.enum(["grade1", "grade2", "grade3"]),
});
export type UpdateGradeInput = z.infer<typeof updateGradeSchema>;

const EGYPTIAN_PHONE_REGEX = /^(\+20|0)?1[0125]\d{8}$/;

// email is deliberately not a field here - there is no self-service
// email-change path anywhere in the app, and this schema backs the one
// route (PATCH /api/profile) that could otherwise be tempted to add one.
export const updatePersonalInfoSchema = z
  .object({
    first_name: z.string().trim().min(1, "الاسم الأول مطلوب").optional(),
    last_name: z.string().trim().min(1, "الاسم الأخير مطلوب").optional(),
    phone: z
      .string()
      .trim()
      .optional()
      .refine((val) => !val || EGYPTIAN_PHONE_REGEX.test(val), {
        message: "رقم هاتف مصري غير صالح (مثال: 01012345678)",
      }),
    parent_phone: z
      .string()
      .trim()
      .optional()
      .refine((val) => !val || EGYPTIAN_PHONE_REGEX.test(val), {
        message: "رقم هاتف ولي أمر مصري غير صالح (مثال: 01012345678)",
      }),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "مفيش بيانات للتحديث" })
  .refine(
    (data) => {
      if (data.phone && data.parent_phone && data.phone.trim() && data.parent_phone.trim()) {
        return data.phone.trim() !== data.parent_phone.trim();
      }
      return true;
    },
    {
      message: "رقم هاتف ولي الأمر لا يمكن أن يكون مطابقاً لرقم هاتفك",
      path: ["parent_phone"],
    },
  );
export type UpdatePersonalInfoInput = z.infer<typeof updatePersonalInfoSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "كلمة المرور الحالية مطلوبة"),
    new_password: z.string().min(8, "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل"),
    confirm_password: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "كلمة المرور وتأكيدها غير متطابقين",
    path: ["confirm_password"],
  })
  .refine((data) => data.current_password !== data.new_password, {
    message: "كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية",
    path: ["new_password"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

