import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { assignRoleSchema } from "@/lib/validation/admin-user.schemas";
import {
  assignRole,
  revokeRole,
  getUserDetail,
  RoleNotFoundError,
  PRIVILEGED_ROLES,
} from "@/lib/services/admin-user-management.service";

const MANAGE_ROLES = ["admin", "super_admin"];
const PRIVILEGED_ROLE_ERROR = "بس السوبر أدمن يقدر يعيّن أو يلغي دور الأدمن";

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
  const parsed = assignRoleSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const isSuperAdmin = await userHasAnyRole(supabase, ["super_admin"]);
  if (!isSuperAdmin) {
    // A plain admin can't grant admin/super_admin - and since assignRole()
    // now replaces the target's roles entirely, reassigning someone who
    // currently holds one of those roles would silently strip it too, so
    // that path needs the same super_admin gate.
    if (PRIVILEGED_ROLES.includes(parsed.data.role_name)) {
      return apiError(PRIVILEGED_ROLE_ERROR, null, 403);
    }
    const target = await getUserDetail(id);
    if (target?.roles.some((r) => PRIVILEGED_ROLES.includes(r))) {
      return apiError(PRIVILEGED_ROLE_ERROR, null, 403);
    }
  }

  try {
    const teacherProfile =
      parsed.data.role_name === "teacher" && parsed.data.teacher_display_name
        ? {
            display_name: parsed.data.teacher_display_name,
            ...(parsed.data.teacher_bio ? { bio: parsed.data.teacher_bio } : {}),
            ...(parsed.data.teacher_experience_years !== undefined
              ? { experience_years: parsed.data.teacher_experience_years }
              : {}),
          }
        : undefined;
    await assignRole(user.id, id, parsed.data.role_name, teacherProfile);
  } catch (error) {
    if (error instanceof RoleNotFoundError) return apiError(error.message, null, 404);
    throw error;
  }
  return apiSuccess(null, "تم تعيين الدور", 201);
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

  const roleName = request.nextUrl.searchParams.get("role_name");
  if (!roleName) return apiError("role_name مطلوب", null, 400);

  if (PRIVILEGED_ROLES.includes(roleName) && !(await userHasAnyRole(supabase, ["super_admin"]))) {
    return apiError(PRIVILEGED_ROLE_ERROR, null, 403);
  }

  try {
    await revokeRole(user.id, id, roleName);
  } catch (error) {
    if (error instanceof RoleNotFoundError) return apiError(error.message, null, 404);
    throw error;
  }
  return apiSuccess(null, "تم إلغاء الدور");
}
