import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { repairIncompleteSelfRegistrations } from "@/lib/services/admin-user-management.service";

const MANAGE_ROLES = ["admin", "super_admin", "support"];

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const result = await repairIncompleteSelfRegistrations(user.id);
  return apiSuccess(result, `تم إصلاح ${result.repaired} من ${result.candidates} حساب`);
}
