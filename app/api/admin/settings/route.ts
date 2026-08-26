import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { updateSettingsSchema } from "@/lib/validation/settings.schemas";
import { getSettings, updateSettings } from "@/lib/services/settings.service";

const VIEW_ROLES = ["admin", "super_admin", "support"];
const MANAGE_ROLES = ["admin", "super_admin"];

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, VIEW_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const prefix = request.nextUrl.searchParams.get("prefix") ?? undefined;
  const settings = await getSettings(prefix);
  return apiSuccess(settings, "تم جلب الإعدادات");
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  await updateSettings(user.id, parsed.data.entries);
  return apiSuccess(null, "تم تحديث الإعدادات");
}
