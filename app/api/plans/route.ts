import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createPlanSchema } from "@/lib/validation/plan.schemas";
import { userHasAnyRole } from "@/lib/auth/require-role";

const MANAGE_ROLES = ["admin", "super_admin", "content_manager"];

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("price_cents");

  if (error) return apiError("تعذر جلب خطط الاشتراك", null, 500);
  return apiSuccess(data, "تم جلب خطط الاشتراك");
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
  const parsed = createPlanSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data, error } = await supabase.from("subscription_plans").insert(parsed.data).select().single();
  if (error) return apiError("تعذر إنشاء الخطة", null, 400);
  return apiSuccess(data, "تم إنشاء الخطة", 201);
}
