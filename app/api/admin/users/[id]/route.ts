import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { softDeleteUser, getUserDetail } from "@/lib/services/admin-user-management.service";

const VIEW_ROLES = ["admin", "super_admin", "support"];
const MANAGE_ROLES = ["admin", "super_admin"];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, VIEW_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const detail = await getUserDetail(id);
  if (!detail) return apiError("المستخدم غير موجود", null, 404);
  return apiSuccess(detail, "تم جلب بيانات المستخدم");
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  await softDeleteUser(user.id, id);
  return apiSuccess(null, "تم حذف المستخدم (يمكن استرجاعه خلال 30 يوم)");
}
