import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; bookmarkId: string }> },
) {
  const { bookmarkId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { error, count } = await supabase
    .from("lesson_bookmarks")
    .delete({ count: "exact" })
    .eq("id", bookmarkId)
    .eq("user_id", user.id);

  if (error) return apiError("تعذر حذف العلامة المرجعية", null, 400);
  if (!count) return apiError("العلامة المرجعية غير موجودة", null, 404);
  return apiSuccess(null, "تم حذف العلامة المرجعية");
}
