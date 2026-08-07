import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { updateModuleSchema } from "@/lib/validation/module.schemas";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = updateModuleSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data, error } = await supabase
    .from("modules")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return apiError("تعذر تحديث الوحدة", null, 400);
  if (!data) return apiError("الوحدة غير موجودة أو مش مسموح تعدّلها", null, 403);
  return apiSuccess(data, "تم تحديث الوحدة");
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { error, count } = await supabase.from("modules").delete({ count: "exact" }).eq("id", id);
  if (error) return apiError("تعذر حذف الوحدة", null, 400);
  if (!count) return apiError("الوحدة غير موجودة أو مش مسموح تحذفها", null, 403);
  return apiSuccess(null, "تم حذف الوحدة");
}
