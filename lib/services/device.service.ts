import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEVICE_COOKIE_NAME, computeDeviceFingerprint } from "./device-fingerprint";

export { DEVICE_COOKIE_NAME, computeDeviceFingerprint };
export const MAX_ACTIVE_DEVICES = 2;
const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Reads the persistent device_id cookie, creating one if this is the
 * browser's first request. Used as the stable half of the device fingerprint
 * (User-Agent alone is not unique/stable enough - Section 5 Device Management).
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(DEVICE_COOKIE_NAME)?.value;
  if (existing) return existing;

  const deviceId = crypto.randomUUID();
  cookieStore.set(DEVICE_COOKIE_NAME, deviceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: DEVICE_COOKIE_MAX_AGE,
    path: "/",
  });
  return deviceId;
}

export type OldestDeviceInfo = { user_agent: string | null; last_active_at: string };

export type DeviceLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "device_limit_reached"; oldestDevice: OldestDeviceInfo };

/**
 * Enforces the "max 2 active devices" policy on login. `authenticated` no
 * longer has UPDATE/DELETE on devices (supabase/migrations/20260801100022_security_fix_devices_rls.sql) -
 * device bookkeeping is a trusted server computation (limits, kicks), not
 * something the client should be able to write to directly, so this always
 * uses the admin client rather than taking one from the caller.
 *
 * `kickOldest` is only true once the caller has already shown the student
 * which device would be signed out and gotten their confirmation - it
 * deactivates the least-recently-active device to make room instead of
 * blocking. Deactivating here only flips `is_active` - the kicked device
 * doesn't actually drop its session until updateSession() (middleware)
 * notices the flag on that device's own next request and signs it out.
 */
export async function enforceDeviceLimit(
  userId: string,
  fingerprint: string,
  userAgent: string | null,
  ipAddress: string | null,
  kickOldest = false,
): Promise<DeviceLimitResult> {
  const supabase = createAdminClient();
  const { data: activeDevices, error } = await supabase
    .from("devices")
    .select("id, device_fingerprint, user_agent, last_active_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("last_active_at", { ascending: true });

  if (error) throw error;

  const existing = activeDevices?.find((d) => d.device_fingerprint === fingerprint);

  if (existing) {
    await supabase
      .from("devices")
      .update({ last_active_at: new Date().toISOString(), user_agent: userAgent, ip_address: ipAddress })
      .eq("id", existing.id);
    return { allowed: true };
  }

  if ((activeDevices?.length ?? 0) >= MAX_ACTIVE_DEVICES) {
    // Sorted ascending by last_active_at above, so the first row is the
    // least-recently-used device - the one that would get bumped.
    const oldest = activeDevices![0];
    if (!kickOldest) {
      return {
        allowed: false,
        reason: "device_limit_reached",
        oldestDevice: { user_agent: oldest.user_agent, last_active_at: oldest.last_active_at },
      };
    }
    const { error: deactivateError } = await supabase
      .from("devices")
      .update({ is_active: false })
      .eq("id", oldest.id);
    if (deactivateError) throw deactivateError;
  }

  // upsert, not insert: two login requests for the same not-yet-registered
  // device (a double-submit, a retry, anything firing the request twice)
  // can both pass the "existing device not found" check above before either
  // commits, then both try to insert the same (user_id, device_fingerprint)
  // pair - the unique constraint on that pair lets one through and makes the
  // other throw. That exception used to crash the whole login request with
  // a generic "server error" (confirmed live: two concurrent login calls,
  // one insert succeeding, the other hitting exactly this). Upserting means
  // the loser of the race just updates the row the winner created instead
  // of erroring.
  const { error: insertError } = await supabase.from("devices").upsert(
    {
      user_id: userId,
      device_fingerprint: fingerprint,
      user_agent: userAgent,
      ip_address: ipAddress,
      is_active: true,
      last_active_at: new Date().toISOString(),
    },
    { onConflict: "user_id,device_fingerprint" },
  );
  if (insertError) throw insertError;

  return { allowed: true };
}

/** Marks the current session's device as active without touching device limits (logout/session refresh). */
export async function touchDevice(userId: string, fingerprint: string) {
  const supabase = createAdminClient();
  await supabase
    .from("devices")
    .update({ last_active_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("device_fingerprint", fingerprint);
}

export const STREAM_SESSION_SECONDS = 15 * 60; // matches BunnyVideoProvider's signed URL TTL

export type StreamLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "another_stream_active" };

/**
 * Section 22 - "Video Stream: 1 بث نشط / جهاز". A device already has one row
 * (from the login device-limit flow); starting playback on lesson A blocks
 * starting playback on lesson B from the same device until A's signed URL
 * would have expired anyway - re-requesting the same lesson (e.g. a page
 * refresh, or the player's periodic re-sign) always succeeds and refreshes
 * the expiry.
 */
export async function enforceSingleActiveStream(
  userId: string,
  fingerprint: string,
  lessonId: string,
): Promise<StreamLimitResult> {
  const supabase = createAdminClient();
  const { data: device } = await supabase
    .from("devices")
    .select("id, current_lesson_id, stream_expires_at")
    .eq("user_id", userId)
    .eq("device_fingerprint", fingerprint)
    .maybeSingle();

  // No device row yet (shouldn't normally happen - every login registers
  // one) - fail open rather than block a legitimate first-ever request.
  if (!device) return { allowed: true };

  const stillActive = device.stream_expires_at && new Date(device.stream_expires_at) > new Date();
  if (stillActive && device.current_lesson_id && device.current_lesson_id !== lessonId) {
    return { allowed: false, reason: "another_stream_active" };
  }

  await supabase
    .from("devices")
    .update({
      current_lesson_id: lessonId,
      stream_expires_at: new Date(Date.now() + STREAM_SESSION_SECONDS * 1000).toISOString(),
    })
    .eq("id", device.id);

  return { allowed: true };
}
