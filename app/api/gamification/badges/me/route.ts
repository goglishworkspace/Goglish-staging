import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data, error } = await supabase
    .from("user_badges")
    .select("awarded_at, badges(id, code, title, description, icon)")
    .eq("user_id", user.id)
    .order("awarded_at", { ascending: false });
  if (error) return apiError("تعذر جلب الشارات", null, 500);
  return apiSuccess(data, "تم جلب الشارات");
}
