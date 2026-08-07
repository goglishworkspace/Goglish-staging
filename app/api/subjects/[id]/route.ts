import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { updateSubjectSchema } from "@/lib/validation/subject.schemas";
import { userHasAnyRole } from "@/lib/auth/require-role";

const MANAGE_ROLES = ["admin", "super_admin", "content_manager"];

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.from("subjects").select("*").eq("id", id).maybeSingle();
  if (error) return apiError("تعذر جلب المادة", null, 500);
  if (!data) return apiError("المادة غير موجودة", null, 404);
  return apiSuccess(data, "تم جلب المادة");
}

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
  const parsed = updateSubjectSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data, error } = await supabase
    .from("subjects")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) return apiError("تعذر تحديث المادة", null, 400);
  if (!data) return apiError("المادة غير موجودة", null, 404);
  return apiSuccess(data, "تم تحديث المادة");
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

  const { error, count } = await supabase.from("subjects").delete({ count: "exact" }).eq("id", id);
  if (error) return apiError("تعذر حذف المادة", null, 400);
  if (!count) return apiError("المادة غير موجودة", null, 404);
  return apiSuccess(null, "تم حذف المادة");
}
