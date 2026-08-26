import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { userHasAnyRole } from "@/lib/auth/require-role";

const VIEW_ROLES = ["admin", "super_admin", "moderator", "content_manager"];

/** Admin Dashboard "Courses Management + Approval" needs to surface lesson
 * submissions too - courses.status and lessons.status are two independent
 * workflow states (Section 6), and without this a teacher's "submit lesson
 * for review" (Phase 11 Teacher Dashboard) had no admin-side counterpart to
 * ever act on it. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, VIEW_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const { data, error } = await supabase
    .from("lessons")
    .select("id, title, status, submitted_at, module_id, modules(title, course_id, courses(title))")
    .not("submitted_at", "is", null)
    .is("deleted_at", null)
    .order("submitted_at", { ascending: true });
  if (error) return apiError("تعذر جلب الدروس في انتظار المراجعة", null, 500);
  return apiSuccess(data, "تم جلب الدروس في انتظار المراجعة");
}
