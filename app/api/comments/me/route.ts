import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

/** Teacher Dashboard checklist item "تعليقاته الخاصة على الدروس" - a
 * cross-lesson view of the caller's own comments (any status - RLS already
 * scopes lesson_comments to "approved for everyone, own rows regardless of
 * status, everything for staff", so .eq("user_id", ...) is sufficient here,
 * same as every other own-row query in the codebase). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data, error } = await supabase
    .from("lesson_comments")
    .select("id, lesson_id, content, status, rejection_reason, created_at, lessons(title)")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return apiError("تعذر جلب تعليقاتك", null, 500);
  return apiSuccess(data, "تم جلب تعليقاتك");
}
