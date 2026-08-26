import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data, error } = await supabase
    .from("devices")
    .select("id, user_agent, ip_address, is_active, last_active_at, created_at")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("last_active_at", { ascending: false });

  if (error) return apiError("تعذر جلب الأجهزة", null, 500);

  return apiSuccess(data, "تم جلب الأجهزة");
}
