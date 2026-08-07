import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { assignPermissionSchema } from "@/lib/validation/role.schemas";
import { logAudit } from "@/lib/services/audit-log.service";

const MANAGE_ROLES = ["admin", "super_admin"];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const parsed = assignPermissionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const admin = createAdminClient();
  const { data: permission } = await admin
    .from("permissions")
    .select("id")
    .eq("name", parsed.data.permission_name)
    .maybeSingle();
  if (!permission) return apiError("الصلاحية غير موجودة", null, 404);

  const { error } = await admin
    .from("permission_role")
    .upsert({ role_id: id, permission_id: permission.id }, { onConflict: "role_id,permission_id", ignoreDuplicates: true });
  if (error) return apiError("تعذر ربط الصلاحية بالدور", null, 400);

  await logAudit({
    actorUserId: user.id,
    action: "role.permission_assigned",
    targetTable: "roles",
    targetId: id,
    metadata: { permission: parsed.data.permission_name },
  });
  return apiSuccess(null, "تم ربط الصلاحية بالدور", 201);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const permissionName = request.nextUrl.searchParams.get("permission_name");
  if (!permissionName) return apiError("permission_name مطلوب", null, 400);

  const admin = createAdminClient();
  const { data: permission } = await admin.from("permissions").select("id").eq("name", permissionName).maybeSingle();
  if (!permission) return apiError("الصلاحية غير موجودة", null, 404);

  await admin.from("permission_role").delete().eq("role_id", id).eq("permission_id", permission.id);

  await logAudit({
    actorUserId: user.id,
    action: "role.permission_revoked",
    targetTable: "roles",
    targetId: id,
    metadata: { permission: permissionName },
  });
  return apiSuccess(null, "تم إلغاء ربط الصلاحية بالدور");
}
