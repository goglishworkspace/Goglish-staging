import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { adminGrantCourseAccess } from "@/lib/services/admin-user-management.service";

const MANAGE_ROLES = ["admin", "super_admin"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
  if (!body?.course_id) return apiError("معرف الكورس مطلوب", null, 400);

  await adminGrantCourseAccess(user.id, id, body.course_id);
  return apiSuccess(null, "تم منح الطالب الوصول للكورس بنجاح");
}
