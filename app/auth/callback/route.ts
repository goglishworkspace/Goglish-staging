import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  completeSelfRegistrationIfNeeded,
  type SelfRegistrationMetadata,
} from "@/lib/services/self-registration.service";

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

/**
 * Shared landing point for Supabase's PKCE email links (signup confirmation,
 * password recovery). The `code` param must be exchanged for a session
 * server-side (so it lands in cookies) before the user reaches a page that
 * expects to already be authenticated - the browser client alone won't do
 * this exchange automatically for @supabase/ssr.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const explicitNext = request.nextUrl.searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth_callback_failed", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth_callback_failed", request.url));
  }

  // Callers that already know exactly where they want to land (password
  // recovery -> /reset-password, the pre-existing register flow ->
  // /verify-email) keep working exactly as before, regardless of role_type.
  // `next` is attacker-visible/modifiable, so only follow it if it's a
  // same-origin relative path - otherwise fall through to the role-based
  // default redirect below rather than bouncing off-site.
  if (explicitNext && isSafeRedirect(explicitNext)) {
    return NextResponse.redirect(new URL(explicitNext, request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const metadata = (user?.user_metadata ?? {}) as SelfRegistrationMetadata;

  if (metadata.role_type === "student" || metadata.role_type === "parent") {
    try {
      const result = await completeSelfRegistrationIfNeeded(user!.id, metadata);
      if (!result.ok) {
        // Invalid/out-of-age-range national ID reached here only if the
        // register form was bypassed (it validates the same way client-side) -
        // refuse to activate the account and sign the half-created session out
        // rather than leave them logged in with no profile.
        await supabase.auth.signOut({ scope: "local" });
        return NextResponse.redirect(new URL(`/register?error=${result.reason}`, request.url));
      }
    } catch (error) {
      // A real infra error (DB hiccup, RPC failure) - don't lock a validly
      // confirmed user out over it. They're already signed in; leave
      // self_registration_completed_at unset and let /api/auth/login's
      // repair path retry this on their next login instead.
      console.error("completeSelfRegistrationIfNeeded failed in auth callback", error);
    }
    const destination = metadata.role_type === "student" ? "/student/choose-grade" : "/parent/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.redirect(new URL("/", request.url));
}
