import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { getTeacherOwnReport } from "@/lib/services/admin-reports.service";
import { TeacherNotFoundError } from "@/lib/services/admin-user-management.service";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  try {
    const report = await getTeacherOwnReport(user.id);
    return apiSuccess(report, "تم جلب تقريرك");
  } catch (error) {
    if (error instanceof TeacherNotFoundError) return apiError(error.message, null, 404);
    throw error;
  }
}
