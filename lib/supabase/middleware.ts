import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEVICE_COOKIE_NAME, computeDeviceFingerprint } from "@/lib/services/device-fingerprint";

/**
 * Refreshes the Supabase auth session cookies on every request, per the
 * standard @supabase/ssr Next.js middleware pattern. Also enforces the
 * device limit's "kick" side (Section 5 Device Management): deleting a
 * device from the profile page, or an admin's "reset devices", both only
 * flip `devices.is_active` to false in the DB - they can't reach into
 * another browser's cookies to end its session directly. This is the other
 * half: the next request *from that specific device* (any device.getUser()
 * already covers on every request) notices its own row is no longer active
 * and signs itself out right here.
 *
 * Fails open when no device row exists at all (e.g. a session created by
 * self-registration, which never goes through /api/auth/login's device
 * registration) - only an explicit is_active=false is treated as "kicked",
 * matching enforceSingleActiveStream's existing fail-open precedent.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Must match lib/supabase/server.ts exactly - this refreshes the same
      // session cookie on every request, so if it wrote the cookie back
      // without httpOnly it would silently undo the hardening there.
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const deviceId = request.cookies.get(DEVICE_COOKIE_NAME)?.value;
  if (user && deviceId) {
    const fingerprint = await computeDeviceFingerprint(deviceId, request.headers.get("user-agent"));
    const { data: device } = await supabase
      .from("devices")
      .select("is_active")
      .eq("user_id", user.id)
      .eq("device_fingerprint", fingerprint)
      .maybeSingle();

    if (device && !device.is_active) {
      // scope: "local" - this must only end *this* device's session, not
      // every device the user is logged into (signOut()'s "global" default) -
      // the whole point is the other, still-active device(s) keep working.
      await supabase.auth.signOut({ scope: "local" });
    }
  }

  return response;
}
