import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { getAvatarSignedUrl } from "@/lib/services/avatar.service";
import { decryptNationalId } from "@/lib/services/national-id.service";
import { updatePersonalInfoSchema } from "@/lib/validation/profile.schemas";

const PERSONAL_INFO_COOLDOWN_DAYS = 30;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, phone, phone_verified_at, national_id_encrypted, birth_date, grade, xp_total, coins_total, current_streak_days, longest_streak_days, comment_banned, comment_suspended_until, comment_ban_reason, created_at, avatar_updated_at, personal_info_updated_at",
    )
    .eq("id", user.id)
    .single();

  if (error) return apiError("تعذر جلب الملف الشخصي", null, 500);
  const { national_id_encrypted, ...rest } = data;
  // Shown in full only to the account owner viewing their own profile - not
  // masked, since there's no one to hide it from here (admin-facing views
  // stay masked; see AdminUserSummary).
  let national_id: string | null = null;
  if (national_id_encrypted) {
    try {
      national_id = decryptNationalId(national_id_encrypted);
    } catch {
      national_id = null;
    }
  }
  const avatar_url = await getAvatarSignedUrl(user.id, data.avatar_updated_at);
  return apiSuccess({ ...rest, national_id, email: user.email, avatar_url }, "تم جلب الملف الشخصي");
}

/** Name/phone can be self-edited at most once every 30 days (Section 6) -
 * email is never accepted here, there is no self-service email-change path
 * anywhere in this app. */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  if (typeof body === "object" && body !== null && "email" in body) {
    return apiError("الإيميل مينفعش يتغير", { email: ["الإيميل مينفعش يتغير"] }, 422);
  }
  const parsed = updatePersonalInfoSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data: current, error: fetchError } = await supabase
    .from("profiles")
    .select("personal_info_updated_at")
    .eq("id", user.id)
    .single();
  if (fetchError) return apiError("تعذر تحديث البيانات", null, 500);

  if (current.personal_info_updated_at) {
    const daysSince = (Date.now() - new Date(current.personal_info_updated_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < PERSONAL_INFO_COOLDOWN_DAYS) {
      const daysLeft = Math.ceil(PERSONAL_INFO_COOLDOWN_DAYS - daysSince);
      return apiError(`تقدر تغيّر اسمك أو بياناتك تاني بعد ${daysLeft} يوم`, null, 429);
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ ...parsed.data, personal_info_updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select("first_name, last_name, phone, personal_info_updated_at")
    .single();

  if (error) return apiError("تعذر تحديث البيانات", null, 400);
  return apiSuccess(data, "تم تحديث البيانات");
}
