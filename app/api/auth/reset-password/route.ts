import { NextRequest } from "next/server";
import { resetPasswordSchema } from "@/lib/validation/auth.schemas";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("جلسة إعادة التعيين غير صالحة أو منتهية، اطلب رابط جديد", null, 401);
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return apiError("تعذر تحديث الباسورد", null, 400);

  return apiSuccess(null, "تم تغيير الباسورد بنجاح");
}
