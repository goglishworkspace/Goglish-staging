import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { updateCouponSchema } from "@/lib/validation/coupon.schemas";
import { userHasAnyRole } from "@/lib/auth/require-role";

const MANAGE_ROLES = ["admin", "super_admin", "content_manager"];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  const parsed = updateCouponSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data, error } = await supabase.from("coupons").update(parsed.data).eq("id", id).select().maybeSingle();
  if (error) return apiError("تعذر تحديث الكوبون", null, 400);
  if (!data) return apiError("الكوبون غير موجود", null, 404);
  return apiSuccess(data, "تم تحديث الكوبون");
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const { error, count } = await supabase.from("coupons").delete({ count: "exact" }).eq("id", id);
  if (error) return apiError("تعذر حذف الكوبون", null, 400);
  if (!count) return apiError("الكوبون غير موجود", null, 404);
  return apiSuccess(null, "تم حذف الكوبون");
}
