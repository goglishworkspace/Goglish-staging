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

  // Handle email/password self-registration completion
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
    const googleName = user.user_metadata?.full_name || user.user_metadata?.name;
    const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;

    const { data: profile } = await admin
      .from("profiles")
      .select("first_name, last_name, grade, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.first_name && googleName) {
      const parts = String(googleName).trim().split(" ");
      const firstName = parts[0] || "";
      const lastName = parts.slice(1).join(" ") || "";
      await admin
        .from("profiles")
        .upsert(
          {
            id: user.id,
            first_name: firstName,
            last_name: lastName,
            ...(googleAvatar ? { avatar_url: googleAvatar } : {}),
            role_type: "student",
          },
          { onConflict: "id" },
        );
    }

    // Check roles
    const { data: existingRoles } = await admin
      .from("role_user")
      .select("roles(name)")
      .eq("user_id", user.id);

    const roles = (existingRoles ?? [])
      .map((r) => (r.roles as unknown as { name: string } | null)?.name)
      .filter(Boolean);

    if (roles.length === 0) {
      const { data: studentRole } = await admin
        .from("roles")
        .select("id")
        .eq("name", "student")
        .maybeSingle();
      if (studentRole) {
        await admin
          .from("role_user")
          .insert({
            user_id: user.id,
            role_id: studentRole.id,
          });
      }
      roles.push("student");
    }

    if (roles.includes("super_admin") || roles.includes("admin")) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if (roles.includes("teacher")) {
      return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
    }
    if (roles.includes("parent")) {
      return NextResponse.redirect(new URL("/parent/dashboard", request.url));
    }

    if (!profile?.grade) {
      return NextResponse.redirect(new URL("/student/choose-grade", request.url));
    }
    return NextResponse.redirect(new URL("/student/dashboard", request.url));
  } catch (err) {
    console.error("OAuth callback sync error", err);
    return NextResponse.redirect(new URL("/student/dashboard", request.url));
  }
}
