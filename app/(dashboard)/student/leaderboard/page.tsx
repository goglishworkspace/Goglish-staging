import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboardData } from "@/lib/services/leaderboard.service";
import { getSubjectsList } from "@/lib/services/subject.service";
import { LeaderboardContent } from "@/components/leaderboard/LeaderboardContent";

export default async function StudentLeaderboardPage() {
  const supabase = await createClient();
  const queryClient = new QueryClient();

  const [leaderboard, subjects] = await Promise.all([
    getLeaderboardData(supabase, "global", null),
    getSubjectsList(supabase),
  ]);

  queryClient.setQueryData(["leaderboard", "global", null], leaderboard);
  queryClient.setQueryData(["subjects", "all"], subjects);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <LeaderboardContent />
    </HydrationBoundary>
  );
}

