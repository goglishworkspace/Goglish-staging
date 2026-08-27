import { NextRequest } from "next/server";
import { loginSchema } from "@/lib/validation/auth.schemas";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, resetRateLimit, getClientIp, LOGIN_FAILURE_RATE_LIMIT } from "@/lib/services/rate-limit.service";
import {
  getOrCreateDeviceId,
  computeDeviceFingerprint,
  enforceDeviceLimit,
} from "@/lib/services/device.service";
import { logAudit } from "@/lib/services/audit-log.service";
import {
  completeSelfRegistrationIfNeeded,
  type SelfRegistrationMetadata,
} from "@/lib/services/self-registration.service";

/** The normal completion path (app/auth/callback/route.ts) only ever fires
 * once, right after a confirmation link's PKCE code exchange succeeds - and
 * that exchange fails if the link is opened in a different browser/device
 * than the one that started signUp() (a very common real pattern: confirm
 * from a phone's mail app after registering on desktop). Supabase still
 * marks the email confirmed regardless, so the user can just log in
 * normally afterward - landing here with a valid session but a profile
 * stuck on the handle_new_user() stub (no phone/grade/national_id). Login
 * is the next guaranteed touchpoint, so retry completion here, keyed off
 * profiles.self_registration_completed_at rather than which fields happen
 * to be null. Best-effort: a failure here must never block a legitimate,
 * already-authenticated login. */
async function repairSelfRegistrationIfNeeded(userId: string, metadata: SelfRegistrationMetadata): Promise<void> {
  if (metadata.role_type !== "student" && metadata.role_type !== "parent") return;

  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("self_registration_completed_at")
      .eq("id", userId)
      .maybeSingle();
    if (profile && !profile.self_registration_completed_at) {
      await completeSelfRegistrationIfNeeded(userId, metadata);
    }
  } catch (error) {
    console.error("self-registration repair failed on login", error);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  // Wrapped end-to-end: any unexpected throw here (a stale/corrupt session
  // cookie confusing the Supabase client, a device-limit DB error, etc.)
  // used to escape as a raw non-JSON 500 - the client's postJson couldn't
  // parse that, so the login button stayed stuck on its loading state
  // forever with no explanation shown to the user.
  try {
    const ip = getClientIp(request);
    // Keyed by IP+email (not IP alone, unlike the loose middleware gate) -
    // so guessing one account's password only throttles attempts against
    // that account, and can't lock out other users sharing the same IP
    // (a school/home network, for example). Checked *before* the real
    // signInWithPassword() call below so it actually blocks further guesses
    // rather than just relabeling the response after Supabase already did
    // the real password check.
    const loginFailureKey = `login-fail:${ip}:${parsed.data.email.toLowerCase()}`;
    const allowedToAttempt = await checkRateLimit(
      loginFailureKey,
      LOGIN_FAILURE_RATE_LIMIT.maxCount,
      LOGIN_FAILURE_RATE_LIMIT.windowSeconds,
      true,
    );
    if (!allowedToAttempt) {
      return apiError("محاولات دخول كتير غلط على الحساب ده، حاول تاني بعد شوية", null, 429);
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error || !data.user) {
      return apiError("الإيميل أو الباسورد غير صحيح", null, 401);
    }

    // A correct password proves this wasn't a brute-force attempt - clear
    // the failure budget right away so it doesn't carry over and throttle
    // this same account's next legitimate login.
    await resetRateLimit(loginFailureKey).catch((err) => console.error("resetRateLimit failed", err));

    await repairSelfRegistrationIfNeeded(data.user.id, (data.user.user_metadata ?? {}) as SelfRegistrationMetadata);

    const userAgent = request.headers.get("user-agent");
    const deviceId = await getOrCreateDeviceId();
    const fingerprint = await computeDeviceFingerprint(deviceId, userAgent);

    // Not part of loginSchema (credentials only) - zod's default object
    // parsing already strips this extra key out of `parsed.data`, so it's
    // read straight off the raw body instead.
    const confirmKick =
      typeof body === "object" && body !== null && (body as { confirm_kick?: unknown }).confirm_kick === true;

    const deviceResult = await enforceDeviceLimit(data.user.id, fingerprint, userAgent, ip, confirmKick);

    if (!deviceResult.allowed) {
      // scope: "local" - signOut() defaults to "global" (every device this
      // user is logged into), which would silently kick their *other*,
      // already-legitimate devices just because a 3rd one failed to log in.
      // Only this just-created, about-to-be-rejected session should end.
      await supabase.auth.signOut({ scope: "local" });
      return apiSuccess(
        { status: "device_limit_confirm" as const, oldest_device: deviceResult.oldestDevice },
        "وصلت للحد الأقصى من الأجهزة",
      );
    }

    // Feeds the Student Report's login history (Section 37) - the one
    // pre-Phase-7 route audit logging was worth wiring into directly, since
    // there's no other record of login events anywhere.
    await logAudit({
      actorUserId: data.user.id,
      action: "user.login",
      targetTable: "auth.users",
      targetId: data.user.id,
      metadata: { ip, user_agent: userAgent },
    });

    return apiSuccess({ status: "ok" as const, user_id: data.user.id }, "تم تسجيل الدخول بنجاح");
  } catch (error) {
    console.error("login failed unexpectedly", error);
    return apiError("حصل خطأ في السيرفر وقت تسجيل الدخول، حاول تاني", null, 500);
  }
}
