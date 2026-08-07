import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

/** Turns off auto-renew (access continues until current_period_end/grace
 * period, matching Section 9 - no immediate loss of paid-for access). RLS +
 * a column-restricted GRANT (auto_renew, cancelled_at only) enforce that a
 * student can only ever touch these two columns on their own subscription. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data, error } = await supabase
    .from("user_subscriptions")
    .update({ auto_renew: false, cancelled_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, auto_renew, cancelled_at")
    .maybeSingle();

  if (error) return apiError("تعذر إلغاء الاشتراك", null, 400);
  if (!data) return apiError("الاشتراك غير موجود أو مش مسموح لك تلغيه", null, 403);
  return apiSuccess(data, "تم إلغاء التجديد التلقائي للاشتراك");
}
