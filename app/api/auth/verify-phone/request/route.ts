import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { verifyPhoneRequestSchema } from "@/lib/validation/auth.schemas";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { getPhoneProvider } from "@/lib/services/phone-provider";

const CODE_EXPIRY_MINUTES = 10;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);

  const parsed = verifyPhoneRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("profiles")
    .update({
      phone: parsed.data.phone,
      phone_verification_code_hash: codeHash,
      phone_verification_expires_at: expiresAt,
      phone_verification_attempts: 0,
    })
    .eq("id", user.id);

  if (error) return apiError("تعذر إرسال كود التحقق", null, 500);

  // لو الرقم عليه واتساب هيتبعت عليه، وإلا SMS - القرار ده هيتاخد فعلياً وقت
  // ربط مزوّد حقيقي؛ الـ Stub الحالي بيبعت "واتساب" افتراضياً.
  await getPhoneProvider().sendCode(parsed.data.phone, code, "whatsapp");

  return apiSuccess(null, "تم إرسال كود التحقق");
}
