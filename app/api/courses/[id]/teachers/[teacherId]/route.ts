import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { userHasAnyRole } from "@/lib/auth/require-role";

const MANAGE_ROLES = ["admin", "super_admin", "content_manager"];

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; teacherId: string }> },
) {
  const { id, teacherId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const { error, count } = await supabase
    .from("course_teachers")
    .delete({ count: "exact" })
    .eq("course_id", id)
    .eq("teacher_id", teacherId);

  if (error) return apiError("تعذر إزالة المدرس من الفريق", null, 400);
  if (!count) return apiError("المدرس غير موجود في فريق الكورس ده", null, 404);
  return apiSuccess(null, "تم إزالة المدرس من الفريق");
}
