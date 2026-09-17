import { NextRequest } from "next/server";
import { registerSchema } from "@/lib/validation/auth.schemas";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  validateNationalId,
  encryptNationalId,
  maskNationalId,
} from "@/lib/services/national-id.service";

const NATIONAL_ID_ERROR_MESSAGES = {
  invalid_format: "الرقم القومي غير صالح",
  underage: "لازم يكون عمرك بين 13 و 19 سنة للتسجيل في المنصة",
  overage: "لازم يكون عمرك بين 13 و 19 سنة للتسجيل في المنصة",
} as const;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { first_name, last_name, email, national_id, phone, password } = parsed.data;

  const idCheck = validateNationalId(national_id);
  if (!idCheck.valid) {
    const message = NATIONAL_ID_ERROR_MESSAGES[idCheck.reason];
    return apiError(message, { national_id: [message] }, 422);
  }

  const admin = createAdminClient();
  const { data: userData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !userData?.user) {
    const errorMsg = createError?.message?.toLowerCase() || "";
    if (
      errorMsg.includes("already registered") ||
      errorMsg.includes("user already exists") ||
      createError?.code === "email_exists" ||
      createError?.code === "user_already_exists"
    ) {
      return apiError("الإيميل ده مسجّل بحساب بالفعل - سجّل دخول أو استخدم نسيت الباسورد", null, 400);
    }
    return apiError(createError?.message ?? "تعذر إنشاء الحساب", null, 400);
  }

  const { error: completeError } = await admin.rpc("complete_registration", {
    p_user_id: userData.user.id,
    p_first_name: first_name,
    p_last_name: last_name,
    p_phone: phone || null,
    p_national_id_encrypted: encryptNationalId(national_id),
    p_national_id_masked: maskNationalId(national_id),
    p_birth_date: idCheck.birthDate.toISOString().slice(0, 10),
  });

  if (completeError) {
    // Avoid leaving an orphaned auth user if profile creation failed.
    await admin.auth.admin.deleteUser(userData.user.id);
    return apiError("تعذر إكمال التسجيل، حاول مرة أخرى", null, 500);
  }

  return apiSuccess(
    { user_id: userData.user.id, email_confirmation_required: false },
    "تم إنشاء الحساب بنجاح",
    201,
  );
}
