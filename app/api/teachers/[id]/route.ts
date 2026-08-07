import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teachers")
    .select(
      "id, status, created_at, teacher_profiles(display_name, bio, photo_url, experience_years, rating_avg, rating_count)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return apiError("تعذر جلب بيانات المدرس", null, 500);
  if (!data) return apiError("المدرس غير موجود", null, 404);
  return apiSuccess(data, "تم جلب بيانات المدرس");
}
