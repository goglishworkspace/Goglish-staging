import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { createRoleSchema } from "@/lib/validation/role.schemas";
import { logAudit } from "@/lib/services/audit-log.service";

const MANAGE_ROLES = ["admin", "super_admin"];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  // permission_role is a real FK junction (role_id -> roles.id,
  // permission_id -> permissions.id), so this embed is a normal PostgREST
  // join, not the sibling-FK situation elsewhere in the codebase.
  const { data, error } = await supabase
    .from("roles")
    .select("*, permission_role(permissions(name))")
    .order("name");
  if (error) return apiError("تعذر جلب الأدوار", null, 500);
  return apiSuccess(data, "تم جلب الأدوار");
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
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("roles").insert(parsed.data).select().single();
  if (error) return apiError("تعذر إنشاء الدور (الاسم مستخدم بالفعل؟)", null, 400);

  await logAudit({ actorUserId: user.id, action: "role.created", targetTable: "roles", targetId: data.id, metadata: { name: data.name } });
  return apiSuccess(data, "تم إنشاء الدور", 201);
}
