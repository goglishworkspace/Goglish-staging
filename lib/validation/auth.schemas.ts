import { z } from "zod";
import { validateNationalId, nationalIdErrorMessage } from "@/lib/national-id";

const password = z
  .string()
  .min(8, "الباسورد لازم يكون 8 أحرف على الأقل");

const nationalId = z
  .string()
  .regex(/^\d{14}$/, "الرقم القومي لازم يكون 14 رقم بالضبط، أرقام فقط");

export const registerSchema = z
  .object({
    first_name: z.string().trim().min(1, "الاسم الأول مطلوب"),
    last_name: z.string().trim().min(1, "الاسم الأخير مطلوب"),
    email: z.email("إيميل غير صالح"),
    national_id: nationalId,
    // HTML inputs submit "" (not undefined) when left blank, so this must
    // accept an empty string too - callers should treat "" as "not provided".
    phone: z.string().trim().optional(),
    password,
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "الباسورد وتأكيد الباسورد مش متطابقين",
    path: ["confirm_password"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// The full domain of profiles.role_type (matches the DB check constraint
// in 20260801100004_full_roles_and_auto_profile_trigger.sql) - use this for
// anything that reads/displays a profile's role_type generally.
export const profileRoleTypeSchema = z.enum([
  "student",
  "parent",
  "teacher",
  "moderator",
  "support",
  "content_manager",
  "accountant",
  "admin",
  "super_admin",
]);
export type ProfileRoleType = z.infer<typeof profileRoleTypeSchema>;

// Section: self-service registration (role selection, client-side signUp()).
// Deliberately narrower than profileRoleTypeSchema above and NOT the same
// type - public self-registration only ever offers student/parent (an
// account can't self-assign "admin" by picking a role card), regardless of
// how many role_type values the database itself now accepts. Still backs
// /api/auth/register too - that route and its tests are untouched.
export const roleTypeSchema = z.enum(["student", "parent"]);
export type RoleType = z.infer<typeof roleTypeSchema>;

export const gradeSchema = z.enum(["grade1", "grade2", "grade3"]);

export const selfRegisterSchema = z
  .object({
    role_type: roleTypeSchema,
    first_name: z.string().trim().min(1, "الاسم الأول مطلوب"),
    last_name: z.string().trim().min(1, "الاسم الأخير مطلوب"),
    email: z.email("إيميل غير صالح"),
    phone: z.string().trim().min(1, "رقم الهاتف مطلوب"),
    password,
    confirm_password: z.string(),
    national_id: z.string().trim().optional(),
    grade: gradeSchema.optional(),
    child_national_id: z.string().trim().optional(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "الباسورد وتأكيد الباسورد مش متطابقين",
    path: ["confirm_password"],
  })
  .superRefine((data, ctx) => {
    if (data.role_type === "student") {
      if (!data.national_id) {
        ctx.addIssue({
          code: "custom",
          path: ["national_id"],
          message: "الرقم القومي مطلوب",
        });
      } else {
        const check = validateNationalId(data.national_id);
        if (!check.valid) {
          ctx.addIssue({ code: "custom", path: ["national_id"], message: nationalIdErrorMessage(check.reason) });
        }
      }
      if (!data.grade) {
        ctx.addIssue({ code: "custom", path: ["grade"], message: "اختر الصف الدراسي" });
      }
    } else {
      // Optional: a parent can register without it and link a child later
      // from the parent portal (POST /api/parent/children) - only validate
      // the format when they actually typed something in, so leaving it
      // blank never blocks registration. The auth callback already treats a
      // missing child_national_id as "skip auto-link" (app/auth/callback/route.ts).
      if (data.child_national_id && !/^\d{14}$/.test(data.child_national_id)) {
        ctx.addIssue({
          code: "custom",
          path: ["child_national_id"],
          message: "الرقم القومي للطالب لازم يكون 14 رقم بالضبط",
        });
      }
    }
  });

export type SelfRegisterInput = z.infer<typeof selfRegisterSchema>;

// Same fields as selfRegisterSchema minus the password ones, plus the
// auth.users id signUp() already returned to the client - see
// app/api/auth/register/sync-metadata/route.ts for why this exists. Kept as
// its own plain object (not derived from selfRegisterSchema, which is
// wrapped in .refine()/.superRefine() and so isn't a plain ZodObject you can
// .omit()/.extend() off of).
export const syncRegisterMetadataSchema = z.object({
  user_id: z.uuid(),
  role_type: roleTypeSchema,
  first_name: z.string().trim().min(1, "الاسم الأول مطلوب"),
  last_name: z.string().trim().min(1, "الاسم الأخير مطلوب"),
  email: z.email("إيميل غير صالح"),
  phone: z.string().trim().optional(),
  national_id: z.string().trim().optional(),
  grade: gradeSchema.optional(),
  child_national_id: z.string().trim().optional(),
});

export type SyncRegisterMetadataInput = z.infer<typeof syncRegisterMetadataSchema>;

export const loginSchema = z.object({
  email: z.email("إيميل غير صالح"),
  password: z.string().min(1, "الباسورد مطلوب"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("إيميل غير صالح"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password,
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "الباسورد وتأكيد الباسورد مش متطابقين",
    path: ["confirm_password"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const verifyPhoneRequestSchema = z.object({
  phone: z.string().trim().min(1, "رقم التليفون مطلوب"),
});

export type VerifyPhoneRequestInput = z.infer<typeof verifyPhoneRequestSchema>;

export const verifyPhoneConfirmSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "الكود لازم يكون 6 أرقام"),
});

export type VerifyPhoneConfirmInput = z.infer<typeof verifyPhoneConfirmSchema>;
