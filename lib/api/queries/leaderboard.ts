import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type LeaderboardRow = {
  user_id: string;
  rank: number;
  xp: number;
  name: string | null;
  avatar_url: string | null;
};

/** Section 10 - two independent boards: global XP ranking, and per-subject
 * XP ranking. Both read from the same pg_cron-refreshed leaderboard_cache. */
export function useLeaderboard(scope: "global" | "subject", subjectId?: string) {
  return useQuery({
    queryKey: ["leaderboard", scope, subjectId ?? null],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<LeaderboardRow[]>>("/api/leaderboard", {
        params: scope === "subject" ? { scope, subject_id: subjectId } : { scope },
      });
      return data.data;
    },
    enabled: scope === "global" || !!subjectId,
    staleTime: 60 * 1000,
  });
}
