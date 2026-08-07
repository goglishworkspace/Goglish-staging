import { NextRequest } from "next/server";
import { loginSchema } from "@/lib/validation/auth.schemas";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import {
  getOrCreateDeviceId,
  computeDeviceFingerprint,
  enforceDeviceLimit,
} from "@/lib/services/device.service";
import { logAudit } from "@/lib/services/audit-log.service";

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
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error || !data.user) {
      return apiError("الإيميل أو الباسورد غير صحيح", null, 401);
    }

    const userAgent = request.headers.get("user-agent");
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const deviceId = await getOrCreateDeviceId();
    const fingerprint = await computeDeviceFingerprint(deviceId, userAgent);

    // Not part of loginSchema (credentials only) - zod's default object
    // parsing already strips this extra key out of `parsed.data`, so it's
    // read straight off the raw body instead.
    const confirmKick =
      typeof body === "object" && body !== null && (body as { confirm_kick?: unknown }).confirm_kick === true;

    const deviceResult = await enforceDeviceLimit(data.user.id, fingerprint, userAgent, ipAddress, confirmKick);

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
    });

    return apiSuccess({ status: "ok" as const, user_id: data.user.id }, "تم تسجيل الدخول بنجاح");
  } catch (error) {
    console.error("login failed unexpectedly", error);
    return apiError("حصل خطأ في السيرفر وقت تسجيل الدخول، حاول تاني", null, 500);
  }
}
