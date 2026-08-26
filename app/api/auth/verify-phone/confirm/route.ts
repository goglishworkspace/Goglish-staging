import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { verifyPhoneConfirmSchema } from "@/lib/validation/auth.schemas";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);

  const parsed = verifyPhoneConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("phone_verification_code_hash, phone_verification_expires_at, phone_verification_attempts")
    .eq("id", user.id)
    .single();

  if (fetchError || !profile?.phone_verification_code_hash) {
    return apiError("لا يوجد طلب تحقق ساري، اطلب كود جديد", null, 400);
  }

  if (profile.phone_verification_attempts >= MAX_ATTEMPTS) {
    return apiError("تجاوزت عدد المحاولات المسموح، اطلب كود جديد", null, 429);
  }

  const expired =
    !profile.phone_verification_expires_at ||
    new Date(profile.phone_verification_expires_at).getTime() < Date.now();
  if (expired) {
    return apiError("انتهت صلاحية الكود، اطلب كود جديد", null, 400);
  }

  const submittedHash = crypto.createHash("sha256").update(parsed.data.code).digest("hex");
  const storedHash = profile.phone_verification_code_hash;
  const isValid =
    submittedHash.length === storedHash.length &&
    crypto.timingSafeEqual(Buffer.from(submittedHash), Buffer.from(storedHash));

  if (!isValid) {
    await supabase
      .from("profiles")
      .update({ phone_verification_attempts: profile.phone_verification_attempts + 1 })
      .eq("id", user.id);
    return apiError("كود غير صحيح", null, 400);
  }

  await supabase
    .from("profiles")
    .update({
      phone_verified_at: new Date().toISOString(),
      phone_verification_code_hash: null,
      phone_verification_expires_at: null,
      phone_verification_attempts: 0,
    })
    .eq("id", user.id);

  return apiSuccess(null, "تم تأكيد رقم التليفون بنجاح");
}
