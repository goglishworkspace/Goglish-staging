import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { getTeacherReport } from "@/lib/services/admin-reports.service";

const VIEW_ROLES = ["admin", "super_admin", "support"];

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

  const report = await getTeacherReport(id);
  return apiSuccess(report, "تم جلب تقرير المدرس");
}
