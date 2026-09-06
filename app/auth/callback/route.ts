import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
 * Shared landing point for Supabase's PKCE email links and OAuth redirects (Google).
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

  if (explicitNext && isSafeRedirect(explicitNext)) {
    return NextResponse.redirect(new URL(explicitNext, request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const metadata = (user.user_metadata ?? {}) as SelfRegistrationMetadata;

  // Handle standard email/password self-registration completion
  if (metadata.role_type === "student" || metadata.role_type === "parent") {
    try {
      const result = await completeSelfRegistrationIfNeeded(user.id, metadata);
      if (!result.ok) {
        await supabase.auth.signOut({ scope: "local" });
        return NextResponse.redirect(new URL(`/register?error=${result.reason}`, request.url));
      }
    } catch (error) {
      console.error("completeSelfRegistrationIfNeeded failed in auth callback", error);
    }
    const destination = metadata.role_type === "student" ? "/student/choose-grade" : "/parent/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
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
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if (roles.includes("teacher")) {
      return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
    }

    // 2. Existing parent with phone goes directly to parent dashboard
    if (roles.includes("parent") && profile?.phone) {
      return NextResponse.redirect(new URL("/parent/dashboard", request.url));
    }

    // 3. Existing student with complete details goes directly to student dashboard
    if (roles.includes("student") && profile?.first_name && profile?.phone && profile?.grade) {
      return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }

    // 4. If avatar is available in Google metadata and not set in profile, save it
    const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
    if (googleAvatar && !profile?.avatar_url) {
      await admin.from("profiles").update({ avatar_url: googleAvatar }).eq("id", user.id);
    }

    // 5. New or incomplete user -> Send to onboarding step (choose role -> enter details)
    return NextResponse.redirect(new URL("/complete-profile", request.url));
  } catch (err) {
    console.error("OAuth callback sync error", err);
    return NextResponse.redirect(new URL("/complete-profile", request.url));
  }
}
