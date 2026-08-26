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
  child_phone?: string;
};

export type CompletionResult = { ok: true } | { ok: false; reason: "invalid_format" | "underage" | "overage" };

export async function completeSelfRegistrationIfNeeded(
  userId: string,
  metadata: SelfRegistrationMetadata,
): Promise<CompletionResult> {
  if (metadata.role_type !== "student" && metadata.role_type !== "parent") return { ok: true };

  const admin = createAdminClient();

  let nationalIdEncrypted: string | null = null;
  let nationalIdMasked: string | null = null;
  let birthDate: string | null = null;

  if (metadata.role_type === "student" && metadata.national_id) {
    const idCheck = validateNationalId(metadata.national_id);
    if (!idCheck.valid) {
      return { ok: false, reason: idCheck.reason };
    }
    nationalIdEncrypted = encryptNationalId(metadata.national_id);
    nationalIdMasked = maskNationalId(metadata.national_id);
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
    p_child_phone: metadata.role_type === "parent" ? (metadata.child_phone ?? null) : null,
  });

  if (error) throw error;

  const childIdentifier = metadata.child_phone || metadata.child_national_id;
  if (metadata.role_type === "parent" && childIdentifier) {
    await linkChildToParent(userId, childIdentifier);
  }

  return { ok: true };
}
