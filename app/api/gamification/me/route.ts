import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { getAllLevels, resolveLevelForXp } from "@/lib/services/level.service";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("xp_total, coins_total, current_streak_days, longest_streak_days")
    .eq("id", user.id)
    .single();
  if (error) return apiError("تعذر جلب بيانات المستخدم", null, 500);

  const levels = await getAllLevels();
  const currentLevel = resolveLevelForXp(levels, profile.xp_total);
  const nextLevel = levels.find((level) => level.min_xp > profile.xp_total) ?? null;

  return apiSuccess(
    {
      xp_total: profile.xp_total,
      coins_total: profile.coins_total,
      current_streak_days: profile.current_streak_days,
      longest_streak_days: profile.longest_streak_days,
      level: currentLevel,
      next_level: nextLevel,
    },
    "تم جلب بيانات المستخدم",
  );
}
