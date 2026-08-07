import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type LeaderboardEntry = {
  user_id: string;
  rank: number;
  xp: number;
  name: string | null;
  avatar_url: string | null;
};

/** Section 28 "Honor Board" - top students by global XP, reused from the
 * same leaderboard_cache-backed endpoint Section 10 exposes. Landing page
 * uses the default top-3 teaser; the dedicated /honor-board page passes a
 * higher limit for the fuller list. */
export function useHonorBoard(limit = 3) {
  return useQuery({
    queryKey: ["honor-board", limit],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<LeaderboardEntry[]>>("/api/leaderboard", {
        params: { scope: "global" },
      });
      return data.data.slice(0, limit);
    },
    staleTime: 5 * 60 * 1000,
  });
}
