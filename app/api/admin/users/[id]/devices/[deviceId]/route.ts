import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { adminKickDevice } from "@/lib/services/admin-user-management.service";

const MANAGE_ROLES = ["admin", "super_admin"];

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; deviceId: string }> },
) {
  const { id, deviceId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  await adminKickDevice(user.id, id, deviceId);
  return apiSuccess(null, "تم تسجيل خروج الجهاز وطرد الجلسة بنجاح");
}
