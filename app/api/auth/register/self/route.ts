import { NextRequest } from "next/server";
import { selfRegisterSchema } from "@/lib/validation/auth.schemas";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { completeSelfRegistrationIfNeeded } from "@/lib/services/self-registration.service";
import { nationalIdErrorMessage } from "@/lib/national-id";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);

  const parsed = selfRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const values = parsed.data;
  const admin = createAdminClient();

  // Create user directly via admin client with email_confirm: true.
  // This guarantees that Supabase sends ZERO emails to Gmail or any mail provider.
  const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
    email: values.email,
    password: values.password,
    email_confirm: true,
    user_metadata: {
      role_type: values.role_type,
      first_name: values.first_name,
      last_name: values.last_name,
      phone: values.phone || undefined,
      parent_phone: values.role_type === "student" ? (values.parent_phone || undefined) : undefined,
      national_id: values.role_type === "student" ? values.national_id : undefined,
      grade: values.role_type === "student" ? values.grade : undefined,
      child_national_id: values.role_type === "parent" ? values.child_national_id : undefined,
      child_phone: values.role_type === "parent" ? values.child_phone : undefined,
    },
  });

  if (createError || !createdUser?.user) {
    const errorMsg = createError?.message?.toLowerCase() || "";
    if (
      errorMsg.includes("already registered") ||
      errorMsg.includes("user already exists") ||
      createError?.code === "email_exists" ||
      createError?.code === "user_already_exists"
    ) {
      return apiError("الإيميل ده مسجّل بحساب بالفعل - سجّل دخول أو استخدم نسيت الباسورد", null, 400);
    }
    return apiError(createError?.message || "تعذر إنشاء الحساب، حاول مرة أخرى", null, 400);
  }

  const userId = createdUser.user.id;

  try {
    const completion = await completeSelfRegistrationIfNeeded(userId, values);
    if (!completion.ok) {
      // If validation fails (e.g. invalid national id reason), roll back user creation
      await admin.auth.admin.deleteUser(userId);
      const msg = `تعذر تفعيل الحساب: ${nationalIdErrorMessage(completion.reason)}`;
      return apiError(msg, null, 422);
    }
  } catch (err) {
    console.error("completeSelfRegistrationIfNeeded error in /api/auth/register/self:", err);
    await admin.auth.admin.deleteUser(userId);
    return apiError("تعذر إكمال التسجيل، حاول مرة أخرى", null, 500);
  }

  return apiSuccess({ user_id: userId }, "تم إنشاء الحساب بنجاح", 201);
}
