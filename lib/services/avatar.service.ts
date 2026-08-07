import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyFileMagicBytes } from "./file-validation.service";

const SIGNED_URL_TTL_SECONDS = 15 * 60;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type AvatarUploadResult =
  | { ok: true; avatarUrl: string }
  | { ok: false; reason: "invalid_type" | "too_large" | "content_mismatch" };

/** One file per user at a deterministic path - re-uploading always overwrites
 * the same object, so there's never a stale/orphaned previous photo left in
 * storage. Private bucket: the returned URL is a short-lived signed URL, not
 * a permanent public link (see 20260801100005_profile_avatars.sql). */
export async function uploadAvatar(userId: string, file: File): Promise<AvatarUploadResult> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) return { ok: false, reason: "invalid_type" };
  if (file.size > MAX_AVATAR_BYTES) return { ok: false, reason: "too_large" };

  const buffer = Buffer.from(await file.arrayBuffer());

  // file.type is client-supplied and trivially spoofed (e.g. an .html file
  // renamed with an image MIME type) - every type in ALLOWED_MIME_TYPES has
  // a known signature, so this always applies here.
  if (!(await verifyFileMagicBytes(buffer, file.type))) return { ok: false, reason: "content_mismatch" };

  const admin = createAdminClient();
  const storagePath = `${userId}`;

  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(storagePath, buffer, { contentType: file.type, upsert: true });
  if (uploadError) throw uploadError;

  const now = new Date().toISOString();
  const { error: updateError } = await admin.from("profiles").update({ avatar_updated_at: now }).eq("id", userId);
  if (updateError) throw updateError;

  const { data: signed } = await admin.storage.from("avatars").createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  return { ok: true, avatarUrl: signed?.signedUrl ?? "" };
}

export async function getAvatarSignedUrl(userId: string, avatarUpdatedAt: string | null): Promise<string | null> {
  if (!avatarUpdatedAt) return null;
  const admin = createAdminClient();
  const { data: signed } = await admin.storage.from("avatars").createSignedUrl(userId, SIGNED_URL_TTL_SECONDS);
  return signed?.signedUrl ?? null;
}

export async function deleteAvatar(userId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.storage.from("avatars").remove([userId]);
  const { error } = await admin.from("profiles").update({ avatar_updated_at: null }).eq("id", userId);
  if (error) throw error;
}
