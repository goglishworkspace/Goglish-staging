import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userHasAnyRole } from "@/lib/auth/require-role";

const REVIEW_ROLES = ["admin", "super_admin", "moderator"];

/** Pending comments, teacher comments first (Section 11 - "تعليقات المدرس
 * تمر بنفس المراجعة، لكن الأولوية أعلى في قائمة المراجعة"), oldest first
 * within each group. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, REVIEW_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const { data: comments, error } = await supabase
    .from("lesson_comments")
    .select("*")
    .eq("status", "pending")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) return apiError("تعذر جلب قائمة المراجعة", null, 500);
  if (!comments?.length) return apiSuccess([], "تم جلب قائمة المراجعة");

  const admin = createAdminClient();
  const { data: teacherRows } = await admin
    .from("teachers")
    .select("user_id")
    .in(
      "user_id",
      comments.map((c) => c.user_id),
    );
  const teacherUserIds = new Set((teacherRows ?? []).map((t) => t.user_id));

  const queue = comments
    .map((comment) => ({ ...comment, is_teacher: teacherUserIds.has(comment.user_id) }))
    .sort((a, b) => (a.is_teacher === b.is_teacher ? 0 : a.is_teacher ? -1 : 1));

  return apiSuccess(queue, "تم جلب قائمة المراجعة");
}
