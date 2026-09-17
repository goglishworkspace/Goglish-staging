import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  completeSelfRegistrationIfNeeded,
  type SelfRegistrationMetadata,
} from "@/lib/services/self-registration.service";
import { getClientIp } from "@/lib/services/rate-limit.service";
import {
  getOrCreateDeviceId,
  computeDeviceFingerprint,
  enforceDeviceLimit,
} from "@/lib/services/device.service";

/** `next` is an attacker-visible/modifiable query param - only ever follow
 * it if it's a same-origin relative path, never an absolute/external URL. */
function isSafeRedirect(url: string): boolean {
  return (
    typeof url === "string" &&
    url.startsWith("/") &&
    !url.startsWith("//") &&
    !url.includes(":")
  );
}

function getOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return request.nextUrl.origin;
}

/**
 * Shared landing point for Supabase's PKCE email links and OAuth redirects (Google).
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const explicitNext = request.nextUrl.searchParams.get("next");
  const errorParam = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get("error_description");
  const origin = getOrigin(request);

  if (errorParam || errorDescription) {
    console.error("[OAuth Callback Error from provider]:", { errorParam, errorDescription });
    const redirectUrl = new URL("/login", origin);
    redirectUrl.searchParams.set("error", errorParam || "oauth_failed");
    if (errorDescription) {
      redirectUrl.searchParams.set("desc", errorDescription);
    }
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    console.error("[OAuth Callback Error]: missing code parameter");
    return NextResponse.redirect(new URL("/login?error=no_code", origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[OAuth Callback Error]: exchangeCodeForSession failed:", error);
    const redirectUrl = new URL("/login", origin);
    redirectUrl.searchParams.set("error", "exchange_failed");
    redirectUrl.searchParams.set("desc", error.message);
    return NextResponse.redirect(redirectUrl);
  }

  if (explicitNext && isSafeRedirect(explicitNext)) {
    return NextResponse.redirect(new URL(explicitNext, origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  // Register device for OAuth session
  try {
    const ip = getClientIp(request);
    const userAgent = request.headers.get("user-agent");
    const deviceId = await getOrCreateDeviceId();
    const fingerprint = await computeDeviceFingerprint(deviceId, userAgent);
    await enforceDeviceLimit(user.id, fingerprint, userAgent, ip, true);
  } catch (err) {
    console.error("Device registration error on auth callback", err);
  }

  const metadata = (user.user_metadata ?? {}) as SelfRegistrationMetadata;

  // Handle standard email/password self-registration completion
  if (metadata.role_type === "student" || metadata.role_type === "parent") {
    try {
      const result = await completeSelfRegistrationIfNeeded(user.id, metadata);
      if (!result.ok) {
        await supabase.auth.signOut({ scope: "local" });
        return NextResponse.redirect(new URL(`/register?error=${result.reason}`, origin));
      }
    } catch (error) {
      console.error("completeSelfRegistrationIfNeeded failed in auth callback", error);
    }
    const destination = metadata.role_type === "student" ? "/student/choose-grade" : "/parent/dashboard";
    return NextResponse.redirect(new URL(destination, origin));
  }

  // Handle OAuth (Google) registration/login
  try {
    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("id, first_name, last_name, phone, grade, role_type, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const { data: existingRoles } = await admin
      .from("role_user")
      .select("roles(name)")
      .eq("user_id", user.id);

    const roles = (existingRoles ?? [])
      .map((r) => (r.roles as unknown as { name: string } | null)?.name)
      .filter(Boolean);

    // 1. Staff and existing privileged roles always go directly to their dashboards
    if (roles.includes("super_admin") || roles.includes("admin")) {
      return NextResponse.redirect(new URL("/admin/dashboard", origin));
    }
    if (roles.includes("teacher")) {
      return NextResponse.redirect(new URL("/teacher/dashboard", origin));
    }

    // 2. Existing parent with phone goes directly to parent dashboard
    if (roles.includes("parent") && profile?.phone) {
      return NextResponse.redirect(new URL("/parent/dashboard", origin));
    }

    // 3. Existing student with complete details goes directly to student dashboard
    if (roles.includes("student") && profile?.first_name && profile?.phone && profile?.grade) {
      return NextResponse.redirect(new URL("/student/dashboard", origin));
    }

    // 4. If avatar is available in Google metadata and not set in profile, save it
    const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
    if (googleAvatar && !profile?.avatar_url) {
      await admin.from("profiles").update({ avatar_url: googleAvatar }).eq("id", user.id);
    }

    // 5. New or incomplete user -> Send to onboarding step (choose role -> enter details)
    return NextResponse.redirect(new URL("/complete-profile", origin));
  } catch (err) {
    console.error("OAuth callback sync error", err);
    return NextResponse.redirect(new URL("/complete-profile", origin));
  }
}
