import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { getStudentDashboard } from "@/lib/services/dashboard.service";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const dashboard = await getStudentDashboard(supabase, user.id);
  return apiSuccess(dashboard, "تم جلب لوحة التحكم");
}
