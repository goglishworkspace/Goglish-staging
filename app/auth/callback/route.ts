import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateNationalId, encryptNationalId, maskNationalId } from "@/lib/services/national-id.service";
import { linkChildToParent } from "@/lib/services/parent-portal.service";

type SelfRegistrationMetadata = {
  role_type?: "student" | "parent";
  first_name?: string;
  last_name?: string;
  phone?: string;
  national_id?: string;
  grade?: "grade1" | "grade2" | "grade3";
  child_national_id?: string;
};

type CompletionResult = { ok: true } | { ok: false; reason: "invalid_format" | "underage" | "overage" };

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

/** Section: self-service registration (register/page.tsx calls
 * supabase.auth.signUp() directly, so unlike /api/auth/register there's no
 * server request in the loop until now) - creates the profile row + grants
 * the role once the email is confirmed and user_metadata is available on a
 * real session. Idempotent (complete_self_registration uses ON CONFLICT DO
 * NOTHING), safe to run on every confirmation link click.
 *
 * A student account only actually activates (profile + role granted) with a
 * valid, 13-19-year-old-encoding national ID - the register form already
 * blocks this client-side via the same validateNationalId(), so reaching
 * this function with a bad one means the form was bypassed. Rather than
 * silently completing registration with null national_id/birth_date (which
 * is what used to happen), refuse to activate the account at all. */
async function completeSelfRegistrationIfNeeded(
  userId: string,
  metadata: SelfRegistrationMetadata,
): Promise<CompletionResult> {
  if (metadata.role_type !== "student" && metadata.role_type !== "parent") return { ok: true };

  const admin = createAdminClient();

  let nationalIdEncrypted: string | null = null;
  let nationalIdMasked: string | null = null;
  let birthDate: string | null = null;

  if (metadata.role_type === "student") {
    const idCheck = metadata.national_id ? validateNationalId(metadata.national_id) : null;
    if (!idCheck?.valid) {
      return { ok: false, reason: idCheck?.reason ?? "invalid_format" };
    }
    nationalIdEncrypted = encryptNationalId(metadata.national_id!);
    nationalIdMasked = maskNationalId(metadata.national_id!);
    birthDate = idCheck.birthDate.toISOString().slice(0, 10);
  }

  await admin.rpc("complete_self_registration", {
    p_user_id: userId,
    p_role_type: metadata.role_type,
    p_first_name: metadata.first_name ?? "",
    p_last_name: metadata.last_name ?? "",
    p_phone: metadata.phone || null,
    p_national_id_encrypted: nationalIdEncrypted,
    p_national_id_masked: nationalIdMasked,
    p_birth_date: birthDate,
    p_grade: metadata.role_type === "student" ? (metadata.grade ?? null) : null,
    p_child_national_id: metadata.role_type === "parent" ? (metadata.child_national_id ?? null) : null,
  });

  // Registration still succeeds even if no match is found yet (the parent
  // just isn't linked) - same self-service linkChildToParent() a parent can
  // also call later from their dashboard to add further children.
  if (metadata.role_type === "parent" && metadata.child_national_id) {
    await linkChildToParent(userId, metadata.child_national_id);
  }

  return { ok: true };
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
    const result = await completeSelfRegistrationIfNeeded(user!.id, metadata);
    if (!result.ok) {
      // Invalid/out-of-age-range national ID reached here only if the
      // register form was bypassed (it validates the same way client-side) -
      // refuse to activate the account and sign the half-created session out
      // rather than leave them logged in with no profile.
      await supabase.auth.signOut({ scope: "local" });
      return NextResponse.redirect(new URL(`/register?error=${result.reason}`, request.url));
    }
    const destination = metadata.role_type === "student" ? "/student/choose-grade" : "/parent/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.redirect(new URL("/", request.url));
}
