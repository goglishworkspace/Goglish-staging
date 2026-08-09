import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateNationalId, encryptNationalId, maskNationalId } from "@/lib/services/national-id.service";
import { linkChildToParent } from "@/lib/services/parent-portal.service";

export type SelfRegistrationMetadata = {
  role_type?: "student" | "parent";
  first_name?: string;
  last_name?: string;
  phone?: string;
  national_id?: string;
  grade?: "grade1" | "grade2" | "grade3";
  child_national_id?: string;
};

export type CompletionResult = { ok: true } | { ok: false; reason: "invalid_format" | "underage" | "overage" };

/** Section: self-service registration (register/page.tsx calls
 * supabase.auth.signUp() directly, so unlike /api/auth/register there's no
 * server request in the loop until now) - creates the profile row + grants
 * the role once the email is confirmed and user_metadata is available on a
 * real session. Idempotent (complete_self_registration uses ON CONFLICT DO
 * UPDATE), safe to re-run.
 *
 * Called from two places: app/auth/callback/route.ts (the normal path,
 * right after the confirmation link's PKCE code exchange succeeds) and
 * app/api/auth/login/route.ts (a repair path - PKCE code exchange fails if
 * the confirmation link is opened in a different browser/device than the
 * one that started signUp(), leaving the account confirmed at Supabase's
 * level but never actually completed on our side; login is the next
 * guaranteed chance to notice and retry via profiles.self_registration_completed_at).
 *
 * A student account only actually activates (profile + role granted) with a
 * valid, 13-19-year-old-encoding national ID - the register form already
 * blocks this client-side via the same validateNationalId(), so reaching
 * this function with a bad one means the form was bypassed. Rather than
 * silently completing registration with null national_id/birth_date (which
 * is what used to happen), refuse to activate the account at all. */
export async function completeSelfRegistrationIfNeeded(
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

  const { error } = await admin.rpc("complete_self_registration", {
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
  // This RPC call used to go unchecked - a real DB-side error (constraint
  // violation, transient failure) silently left the account on its
  // handle_new_user() stub forever, indistinguishable from success to every
  // caller. Surfacing it lets both call sites at least log it, and the login
  // repair path's self_registration_completed_at check keeps retrying it.
  if (error) throw error;

  // Registration still succeeds even if no match is found yet (the parent
  // just isn't linked) - same self-service linkChildToParent() a parent can
  // also call later from their dashboard to add further children.
  if (metadata.role_type === "parent" && metadata.child_national_id) {
    await linkChildToParent(userId, metadata.child_national_id);
  }

  return { ok: true };
}
