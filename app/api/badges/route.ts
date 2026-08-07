import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createBadgeSchema } from "@/lib/validation/badge.schemas";
import { userHasAnyRole } from "@/lib/auth/require-role";

const MANAGE_ROLES = ["admin", "super_admin", "content_manager"];

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("badges")
    .select("*")
    .eq("is_active", true)
    .order("criteria_type")
    .order("criteria_value");

  if (error) return apiError("تعذر جلب الشارات", null, 500);
  return apiSuccess(data, "تم جلب الشارات");
}

export async function POST(request: NextRequest) {
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
  const parsed = createBadgeSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data, error } = await supabase.from("badges").insert(parsed.data).select().single();
  if (error) return apiError("تعذر إنشاء الشارة (الكود مستخدم بالفعل؟)", null, 400);
  return apiSuccess(data, "تم إنشاء الشارة", 201);
}
