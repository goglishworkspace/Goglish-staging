import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAllLevels } from "./level.service";

export type AchievementEvent =
  | { type: "badge"; code: string; title: string; icon: string; at: string }
  | { type: "level_up"; level_number: number; title: string; at: string };

/** No dedicated ledger table for this - it's a read-only merge of
 * user_badges + level-up moments (derived by replaying xp_transactions
 * against the levels thresholds), sorted into one chronological feed. */
export async function getAchievementsFeed(userId: string): Promise<AchievementEvent[]> {
  const admin = createAdminClient();

  const [{ data: badgeRows }, { data: xpRows }, levels] = await Promise.all([
    admin
      .from("user_badges")
      .select("awarded_at, badges(code, title, icon)")
      .eq("user_id", userId),
    admin
      .from("xp_transactions")
      .select("amount, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    getAllLevels(),
  ]);

  const events: AchievementEvent[] = [];

  for (const row of badgeRows ?? []) {
    const badge = row.badges as unknown as { code: string; title: string; icon: string } | null;
    if (!badge) continue;
    events.push({ type: "badge", code: badge.code, title: badge.title, icon: badge.icon, at: row.awarded_at });
  }

  // Replay XP transactions in order to find the moment cumulative XP first
  // crossed each level's threshold - level 1 (min_xp 0) is everyone's
  // starting point, not a meaningful event, so it's skipped.
  const thresholds = levels.filter((level) => level.min_xp > 0);
  let cumulativeXp = 0;
  let nextThresholdIndex = 0;
  for (const row of xpRows ?? []) {
    cumulativeXp += row.amount as number;
    while (
      nextThresholdIndex < thresholds.length &&
      cumulativeXp >= thresholds[nextThresholdIndex].min_xp
    ) {
      const level = thresholds[nextThresholdIndex];
      events.push({ type: "level_up", level_number: level.level_number, title: level.title, at: row.created_at });
      nextThresholdIndex += 1;
    }
  }

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return events;
}
