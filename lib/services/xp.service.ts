import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordDailyActivity } from "./streak.service";
import { runGamificationHooks } from "./gamification-hooks.service";

export async function awardXpIfPassed(params: {
  userId: string;
  sourceType: "quiz" | "exam";
  sourceId: string;
  xpReward: number;
  coinReward: number;
  passed: boolean;
}): Promise<void> {
  const { userId, sourceType, sourceId, xpReward, coinReward, passed } = params;
  if (!passed) return;

  if (xpReward > 0 || coinReward > 0) {
    const admin = createAdminClient();
    const { error } = await admin.rpc("award_gamification_rewards", {
      p_user_id: userId,
      p_xp_amount: xpReward,
      p_coin_amount: coinReward,
      p_reason: `${sourceType}_passed`,
      p_source_type: sourceType,
      p_source_id: sourceId,
    });
    if (error) throw error;
  }

  // Passing a quiz/exam counts as real study activity for the Daily Streak,
  // and may itself push the student over a badge threshold.
  await recordDailyActivity(userId);
  await runGamificationHooks(userId);
}
