import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { createPermissionSchema } from "@/lib/validation/role.schemas";
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

  const { data, error } = await supabase.from("permissions").select("*").order("name");
  if (error) return apiError("تعذر جلب الصلاحيات", null, 500);
  return apiSuccess(data, "تم جلب الصلاحيات");
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
  const parsed = createPermissionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("permissions").insert(parsed.data).select().single();
  if (error) return apiError("تعذر إنشاء الصلاحية (الاسم مستخدم بالفعل؟)", null, 400);

  await logAudit({ actorUserId: user.id, action: "permission.created", targetTable: "permissions", targetId: data.id, metadata: { name: data.name } });
  return apiSuccess(data, "تم إنشاء الصلاحية", 201);
}
