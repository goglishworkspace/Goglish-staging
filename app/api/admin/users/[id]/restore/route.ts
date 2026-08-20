import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { restoreUser, UserNotDeletedError } from "@/lib/services/admin-user-management.service";

const MANAGE_ROLES = ["admin", "super_admin"];

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  try {
    await restoreUser(user.id, id);
  } catch (error) {
    if (error instanceof UserNotDeletedError) return apiError(error.message, null, 409);
    throw error;
  }
  return apiSuccess(null, "تم استرجاع المستخدم");
}
