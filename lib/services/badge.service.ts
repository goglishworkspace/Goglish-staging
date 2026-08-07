import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAllLevels, resolveLevelForXp } from "./level.service";

type CriteriaType = "xp_total" | "streak_days" | "level_reached" | "quizzes_passed" | "exams_passed";

/** Each criteria_type has exactly one way to compute it today - this is
 * deliberately a fixed set of evaluators, not a generic rule engine. Adding
 * a new criteria_type means adding a branch here too. */
async function computeMetric(
  admin: SupabaseClient,
  userId: string,
  criteriaType: CriteriaType,
): Promise<number> {
  if (criteriaType === "xp_total" || criteriaType === "streak_days" || criteriaType === "level_reached") {
    const { data: profile } = await admin
      .from("profiles")
      .select("xp_total, current_streak_days")
      .eq("id", userId)
      .single();
    if (criteriaType === "xp_total") return profile?.xp_total ?? 0;
    if (criteriaType === "streak_days") return profile?.current_streak_days ?? 0;
    const levels = await getAllLevels();
    const level = resolveLevelForXp(levels, profile?.xp_total ?? 0);
    return level?.level_number ?? 0;
  }

  if (criteriaType === "quizzes_passed") {
    const { data } = await admin
      .from("student_quiz_attempts")
      .select("quiz_id")
      .eq("user_id", userId)
      .eq("passed", true);
    // Distinct quizzes, not raw attempt count - re-passing an already-passed
    // quiz shouldn't let a student farm this badge.
    return new Set((data ?? []).map((row) => row.quiz_id as string)).size;
  }

  // exams_passed - one attempt per exam per user is already DB-enforced.
  const { count } = await admin
    .from("student_exam_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("passed", true);
  return count ?? 0;
}

/** Awards any active badge whose criteria the user now meets and doesn't
 * already have. Safe to call after every gamification-relevant event -
 * cheap no-op once all eligible badges are earned. */
export async function evaluateBadgesForUser(userId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: earnedRows } = await admin.from("user_badges").select("badge_id").eq("user_id", userId);
  const earnedIds = new Set((earnedRows ?? []).map((row) => row.badge_id as string));

  const { data: badges } = await admin
    .from("badges")
    .select("id, criteria_type, criteria_value")
    .eq("is_active", true);
  if (!badges) return;

  const metricCache = new Map<CriteriaType, number>();

  for (const badge of badges) {
    if (earnedIds.has(badge.id)) continue;
    const criteriaType = badge.criteria_type as CriteriaType;
    if (!metricCache.has(criteriaType)) {
      metricCache.set(criteriaType, await computeMetric(admin, userId, criteriaType));
    }
    const metric = metricCache.get(criteriaType)!;
    if (metric >= badge.criteria_value) {
      await admin
        .from("user_badges")
        .upsert(
          { user_id: userId, badge_id: badge.id },
          { onConflict: "user_id,badge_id", ignoreDuplicates: true },
        );
    }
  }
}
