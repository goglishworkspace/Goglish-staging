import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { getAchievementsFeed } from "@/lib/services/achievements.service";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const feed = await getAchievementsFeed(user.id);
  return apiSuccess(feed, "تم جلب الإنجازات");
}
