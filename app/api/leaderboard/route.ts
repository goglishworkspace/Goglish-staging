import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAvatarSignedUrl } from "@/lib/services/avatar.service";

const LEADERBOARD_LIMIT = 50;

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
  let query = supabase
    .from("leaderboard_cache")
    .select("user_id, rank, xp")
    .eq("scope", scope)
    .order("rank")
    .limit(LEADERBOARD_LIMIT);

  query = scope === "subject" ? query.eq("subject_id", subjectId) : query.is("subject_id", null);

  const { data: rows, error } = await query;
  if (error) return apiError("تعذر جلب لوحة الصدارة", null, 500);
  if (!rows?.length) return apiSuccess([], "تم جلب لوحة الصدارة");

  // leaderboard_cache.user_id and profiles.id are sibling FKs to auth.users,
  // not FKs to each other - PostgREST can't embed across that, so names are
  // resolved with a second batched lookup instead. Uses the admin client
  // deliberately: profiles RLS is own-row-or-staff only, but a public
  // leaderboard (Section 28 - "Honor Board") legitimately needs to show
  // other students' first/last names (and avatars, same reasoning).
  const admin = createAdminClient();
  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, first_name, last_name, avatar_updated_at")
    .in(
      "id",
      rows.map((row) => row.user_id),
    );
  if (profilesError) return apiError("تعذر جلب أسماء الطلاب", null, 500);

  const profileById = new Map(profiles?.map((p) => [p.id, p]));
  const leaderboard = await Promise.all(
    rows.map(async (row) => {
      const profile = profileById.get(row.user_id);
      const name = profile ? `${profile.first_name} ${profile.last_name}`.trim() || null : null;
      const avatar_url = profile ? await getAvatarSignedUrl(row.user_id, profile.avatar_updated_at) : null;
      return { ...row, name, avatar_url };
    }),
  );

  return apiSuccess(leaderboard, "تم جلب لوحة الصدارة");
}
