import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data, error } = await supabase
    .from("ranking_history")
    .select("scope, subject_id, rank, xp, recorded_at")
    .eq("user_id", user.id)
    .order("recorded_at", { ascending: false })
    .limit(100);
  if (error) return apiError("تعذر جلب تاريخ الترتيب", null, 500);
  return apiSuccess(data, "تم جلب تاريخ الترتيب");
}
