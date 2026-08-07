import { NextRequest } from "next/server";
import { forgotPasswordSchema } from "@/lib/validation/auth.schemas";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const origin = request.nextUrl.origin;
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Always succeed regardless of whether the email is registered, to avoid
  // leaking which emails exist in the system.
  return apiSuccess(null, "لو الإيميل مسجل عندنا، هيوصلك رابط لإعادة تعيين الباسورد");
}
