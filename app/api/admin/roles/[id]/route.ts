import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { updateRoleSchema } from "@/lib/validation/role.schemas";
import { logAudit } from "@/lib/services/audit-log.service";

const MANAGE_ROLES = ["admin", "super_admin"];

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
  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("roles").update(parsed.data).eq("id", id).select().maybeSingle();
  if (error) return apiError("تعذر تحديث الدور", null, 400);
  if (!data) return apiError("الدور غير موجود", null, 404);

  await logAudit({ actorUserId: user.id, action: "role.updated", targetTable: "roles", targetId: id });
  return apiSuccess(data, "تم تحديث الدور");
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

  const admin = createAdminClient();
  const { error, count } = await admin.from("roles").delete({ count: "exact" }).eq("id", id);
  if (error) return apiError("تعذر حذف الدور", null, 400);
  if (!count) return apiError("الدور غير موجود", null, 404);

  await logAudit({ actorUserId: user.id, action: "role.deleted", targetTable: "roles", targetId: id });
  return apiSuccess(null, "تم حذف الدور");
}
