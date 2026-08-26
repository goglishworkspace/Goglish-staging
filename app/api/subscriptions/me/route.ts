import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*, subscription_plans(name, kind, includes_parent_tracking, family_seats)")
    .eq("user_id", user.id)
    .in("status", ["active", "grace_period"])
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (error) return apiError("تعذر جلب الاشتراك", null, 500);
  return apiSuccess(data, "تم جلب الاشتراك");
}
