import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { getDeletedUserIds } from "@/lib/services/teacher-visibility.service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teachers")
    .select(
      "id, user_id, status, created_at, teacher_profiles(display_name, bio, photo_url, experience_years, rating_avg, rating_count)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return apiError("تعذر جلب بيانات المدرس", null, 500);
  if (!data) return apiError("المدرس غير موجود", null, 404);

  const deletedUserIds = await getDeletedUserIds([data.user_id]);
  if (deletedUserIds.has(data.user_id)) return apiError("المدرس غير موجود", null, 404);

  return apiSuccess({ ...data, user_id: undefined }, "تم جلب بيانات المدرس");
}
