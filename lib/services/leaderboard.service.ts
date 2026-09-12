import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAvatarsSignedUrls } from "@/lib/services/avatar.service";
import type { LeaderboardRow } from "@/lib/api/queries/leaderboard";

const LEADERBOARD_LIMIT = 50;

export async function getLeaderboardData(
  supabase: SupabaseClient,
  scope: "global" | "subject" = "global",
  subjectId?: string | null,
): Promise<LeaderboardRow[]> {
  let query = supabase
    .from("leaderboard_cache")
    .select("user_id, rank, xp")
    .eq("scope", scope)
    .order("rank")
    .limit(LEADERBOARD_LIMIT);

  query = scope === "subject" && subjectId ? query.eq("subject_id", subjectId) : query.is("subject_id", null);

  const { data: rows, error } = await query;
  if (error || !rows?.length) return [];

  const admin = createAdminClient();
  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, first_name, last_name, avatar_updated_at")
    .in(
      "id",
      rows.map((row) => row.user_id),
    );

  if (profilesError) return [];

  const profileById = new Map(profiles?.map((p) => [p.id, p]));
  const avatarUrlMap = await getAvatarsSignedUrls(
    rows.map((row) => ({
      userId: row.user_id,
      avatarUpdatedAt: profileById.get(row.user_id)?.avatar_updated_at ?? null,
    })),
  );

  return rows.map((row) => {
    const profile = profileById.get(row.user_id);
    const name = profile ? `${profile.first_name} ${profile.last_name}`.trim() || null : null;
    const avatar_url = avatarUrlMap.get(row.user_id) ?? null;
    return { ...row, name, avatar_url };
  });
}
