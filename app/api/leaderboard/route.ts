import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboardData } from "@/lib/services/leaderboard.service";

/** Reads from leaderboard_cache (Section 10 - refreshed every 5 minutes by
 * pg_cron), never a live aggregation - see 20260728120011_leaderboard_cron.sql. */
export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get("scope") ?? "global";
  if (scope !== "global" && scope !== "subject") {
    return apiError("scope لازم يكون global أو subject", null, 400);
  }

  const subjectId = request.nextUrl.searchParams.get("subject_id");
  if (scope === "subject" && !subjectId) {
    return apiError("subject_id مطلوب لما scope=subject", null, 400);
  }

  const supabase = await createClient();
  const leaderboard = await getLeaderboardData(supabase, scope, subjectId);
  return apiSuccess(leaderboard, "تم جلب لوحة الصدارة");
}
