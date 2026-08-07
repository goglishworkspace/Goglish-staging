import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { userHasAnyRole } from "@/lib/auth/require-role";

const VIEW_ROLES = ["admin", "super_admin", "support", "accountant"];

/** Powers the "how many students bought this course" column on /admin/courses -
 * course_id only (never user_id) since the admin course list has no use for
 * who specifically bought it, just the count per course. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, VIEW_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const { data, error } = await supabase.from("course_entitlements").select("course_id").is("revoked_at", null);
  if (error) return apiError("تعذر جلب بيانات الاشتراكات", null, 500);
  return apiSuccess(data, "تم جلب بيانات الاشتراكات");
}
