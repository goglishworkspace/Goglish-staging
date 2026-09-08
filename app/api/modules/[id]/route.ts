import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateModuleSchema } from "@/lib/validation/module.schemas";
import { canUserManageModule } from "@/lib/services/course-permission.service";

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

  const authorized = await canUserManageModule(user.id, id);
  if (!authorized) {
    return apiError("الوحدة غير موجودة أو مش مسموح تعدّلها", null, 403);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
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

  const authorized = await canUserManageModule(user.id, id);
  if (!authorized) {
    return apiError("الوحدة غير موجودة أو مش مسموح تحذفها", null, 403);
  }

  const admin = createAdminClient();
  const { error, count } = await admin.from("modules").delete({ count: "exact" }).eq("id", id);
  if (error) return apiError("تعذر حذف الوحدة", null, 400);
  if (!count) return apiError("الوحدة غير موجودة أو مش مسموح تحذفها", null, 403);
  return apiSuccess(null, "تم حذف الوحدة");
}

