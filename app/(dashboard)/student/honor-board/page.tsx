import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboardData } from "@/lib/services/leaderboard.service";
import { HonorBoardContent } from "@/components/honor-board/HonorBoardContent";

export default async function StudentHonorBoardPage() {
  const supabase = await createClient();
  const queryClient = new QueryClient();

  const leaderboard = await getLeaderboardData(supabase, "global", null);
  queryClient.setQueryData(["honor-board", 20], leaderboard.slice(0, 20));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HonorBoardContent leaderboardHref="/student/leaderboard" />
    </HydrationBoundary>
  );
}

