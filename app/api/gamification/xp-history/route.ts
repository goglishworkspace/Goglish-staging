import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data, error } = await supabase
    .from("xp_transactions")
    .select("id, amount, reason, source_type, source_id, subject_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return apiError("تعذر جلب سجل الـ XP", null, 500);
  return apiSuccess(data, "تم جلب سجل الـ XP");
}
