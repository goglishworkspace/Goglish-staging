import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { isParentOfStudent, getChildNotifications } from "@/lib/services/parent-portal.service";

export async function GET(_request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const isLinked = await isParentOfStudent(user.id, studentId);
  if (!isLinked) return apiError("مش مسموح لك تشوف بيانات الطالب ده", null, 403);

  const notifications = await getChildNotifications(studentId);
  return apiSuccess(notifications, "تم جلب إشعارات الابن");
}
