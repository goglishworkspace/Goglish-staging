import { NextRequest } from "next/server";
import { registerSchema } from "@/lib/validation/auth.schemas";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
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

  const origin = request.nextUrl.origin;
  const supabase = await createClient();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/verify-email` },
  });

  // A *confirmed* existing email hits this branch as a real GoTrue error
  // (unlike an unconfirmed pending signup, which comes back as a "success"
  // with an empty identities array - handled below). Passing that error
  // straight through leaks account existence just as directly as the
  // identities-array case, so it gets the same generic response here.
  if (signUpError?.code === "user_already_exists") {
    return apiSuccess(
      { user_id: null, email_confirmation_required: true },
      "تم إنشاء الحساب، تحقق من إيميلك لتأكيد الحساب",
      201,
    );
  }

  if (signUpError || !signUpData.user) {
    const status =
      signUpError?.status && signUpError.status >= 400 && signUpError.status < 500
        ? signUpError.status
        : 400;
    return apiError(signUpError?.message ?? "تعذر إنشاء الحساب", null, status);
  }

  // Supabase's signUp() returns a *success* response (no error) for an email
  // that's already registered, to avoid leaking which emails exist. The only
  // way to detect it: an existing account comes back with an empty
  // `identities` array instead of a new one. We mirror that here: return the
  // exact same generic response as a real new registration, and - critically -
  // skip complete_registration entirely. It's an UPSERT keyed on this user's
  // real id (see 20260801100004_full_roles_and_auto_profile_trigger.sql), so
  // calling it here would silently overwrite an already-registered user's
  // real name/phone/national ID with whatever this submitter typed.
  if (signUpData.user.identities?.length === 0) {
    return apiSuccess(
      { user_id: signUpData.user.id, email_confirmation_required: !signUpData.session },
      "تم إنشاء الحساب، تحقق من إيميلك لتأكيد الحساب",
      201,
    );
  }

  const admin = createAdminClient();
  const { error: completeError } = await admin.rpc("complete_registration", {
    p_user_id: signUpData.user.id,
    p_first_name: first_name,
    p_last_name: last_name,
    p_phone: phone || null,
    p_national_id_encrypted: encryptNationalId(national_id),
    p_national_id_masked: maskNationalId(national_id),
    p_birth_date: idCheck.birthDate.toISOString().slice(0, 10),
  });

  if (completeError) {
    // Avoid leaving an orphaned auth user if profile creation failed.
    await admin.auth.admin.deleteUser(signUpData.user.id);
    return apiError("تعذر إكمال التسجيل، حاول مرة أخرى", null, 500);
  }

  return apiSuccess(
    { user_id: signUpData.user.id, email_confirmation_required: !signUpData.session },
    "تم إنشاء الحساب، تحقق من إيميلك لتأكيد الحساب",
    201,
  );
}
