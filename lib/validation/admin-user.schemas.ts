import { z } from "zod";

export const banUserSchema = z.object({
  reason: z.string().trim().min(1).optional(),
});
export type BanUserInput = z.infer<typeof banUserSchema>;

export const suspendTeacherSchema = z.object({
  reason: z.string().trim().min(1).optional(),
});
export type SuspendTeacherInput = z.infer<typeof suspendTeacherSchema>;

export const assignRoleSchema = z
  .object({
    role_name: z.string().trim().min(1, "اسم الدور مطلوب"),
    teacher_display_name: z.string().trim().optional(),
    teacher_bio: z.string().trim().optional(),
    teacher_experience_years: z.number().int().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role_name === "teacher" && !data.teacher_display_name) {
      ctx.addIssue({ code: "custom", path: ["teacher_display_name"], message: "اسم العرض مطلوب لتعيين دور مدرس" });
    }
  });
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
