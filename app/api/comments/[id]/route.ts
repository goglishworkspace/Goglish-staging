import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

/** Soft delete only (Section 23) - the comment's own author, or an
 * admin/moderator (Section 11: both allowed, independently of status). RLS +
 * a column-restricted GRANT(deleted_at) are what actually enforce this. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data, error } = await supabase
    .from("lesson_comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) return apiError("تعذر حذف التعليق", null, 400);
  if (!data) return apiError("التعليق غير موجود أو مش مسموح لك تحذفه", null, 404);
  return apiSuccess(null, "تم حذف التعليق");
}
