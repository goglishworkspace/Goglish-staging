import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncRegisterMetadataSchema } from "@/lib/validation/auth.schemas";

/**
 * Supabase's signUp() silently drops the new metadata when it's called a
 * second time for an email that already has an unconfirmed identity - it
 * just resends the confirmation email using whatever `data` was passed the
 * *first* time that email ever signed up. So a student who retries
 * registration (a second attempt after an earlier abandoned one, a typo'd
 * national ID they had to redo, etc.) ends up with `auth.users.raw_user_meta_data`
 * frozen on their very first attempt's values - and complete_self_registration
 * (app/auth/callback/route.ts) reads phone/grade/etc. straight out of that
 * metadata, so the profile silently gets the stale data (or none) instead of
 * what they just typed.
 *
 * The register form calls this right after every signUp() call (new or
 * retried alike) to force `user_metadata` to the values just submitted,
 * closing that gap - see app/(auth)/register/page.tsx.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = syncRegisterMetadataSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { user_id, email, ...metadata } = parsed.data;
  const admin = createAdminClient();

  // Defends against an attacker who somehow obtained/guessed a stranger's
  // auth.users id - only the caller who actually holds the signUp() response
  // for this exact email (i.e. the same registration attempt) can pass this.
  const { data: existing, error: getError } = await admin.auth.admin.getUserById(user_id);
  if (getError || !existing.user || existing.user.email !== email) {
    return apiError("تعذر تحديث بيانات التسجيل", null, 403);
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(user_id, {
    user_metadata: { email, ...metadata },
  });
  if (updateError) return apiError("تعذر تحديث بيانات التسجيل", null, 500);

  return apiSuccess(null, "تم تحديث بيانات التسجيل");
}
