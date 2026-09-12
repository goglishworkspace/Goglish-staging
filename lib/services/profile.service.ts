import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAvatarSignedUrl } from "@/lib/services/avatar.service";
import { decryptNationalId } from "@/lib/services/national-id.service";
import type { Profile } from "@/lib/api/queries/profile";

export async function getOwnProfile(
  supabase: SupabaseClient,
  userId: string,
  userEmail?: string | null,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, phone, phone_verified_at, parent_phone, national_id_encrypted, birth_date, grade, xp_total, coins_total, current_streak_days, longest_streak_days, comment_banned, comment_suspended_until, comment_ban_reason, created_at, avatar_updated_at, personal_info_updated_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;

  let national_id: string | null = null;
  if (data.national_id_encrypted) {
    try {
      national_id = decryptNationalId(data.national_id_encrypted);
    } catch {
      national_id = null;
    }
  }

  const avatar_url = await getAvatarSignedUrl(userId, data.avatar_updated_at);
  const { national_id_encrypted: _national_id_encrypted, ...rest } = data;

  return {
    ...rest,
    national_id,
    email: userEmail ?? "",
    avatar_url,
  } as Profile;
}
