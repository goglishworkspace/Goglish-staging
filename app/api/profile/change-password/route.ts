import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { changePasswordSchema } from "@/lib/validation/profile.schemas";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  // Verify current password first by attempting a sign-in
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current_password,
  });

  if (verifyError) {
    return apiError(
      "كلمة المرور الحالية غير صحيحة",
      { current_password: ["كلمة المرور الحالية غير صحيحة"] },
      400,
    );
  }

  // Update password for the authenticated user
  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
  });

  if (updateError) {
    return apiError(updateError.message || "تعذر تحديث كلمة المرور", null, 500);
  }

  return apiSuccess(null, "تم تغيير كلمة المرور بنجاح");
}
