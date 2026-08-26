import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyFileMagicBytes, hasMagicByteSignature } from "./file-validation.service";

export class MediaValidationError extends Error {}

const TYPE_BY_MIME: Record<string, "image" | "pdf" | "audio" | "zip"> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "application/pdf": "pdf",
  "audio/mpeg": "audio",
  "audio/wav": "audio",
  "application/zip": "zip",
};

/** Section 17 - Media Library. Videos aren't handled here (they're Bunny/
 * YouTube links on lessons, not files); this is for images/PDFs/banners/
 * teacher photos actually uploaded to Storage. */
export async function uploadMediaFile(params: { file: File; uploadedBy: string }) {
  const admin = createAdminClient();
  const fileType = TYPE_BY_MIME[params.file.type] ?? "other";
  const buffer = Buffer.from(await params.file.arrayBuffer());

  // file.type is client-supplied and trivially spoofed (e.g. an .html file
  // renamed with an image MIME type) - only reject when we actually know
  // what the declared type's bytes should look like; other otherwise-allowed
  // types (audio, zip, ...) have no signature here and pass through as before.
  if (hasMagicByteSignature(params.file.type) && !(await verifyFileMagicBytes(buffer, params.file.type))) {
    throw new MediaValidationError("محتوى الملف مش متطابق مع نوعه المعلن");
  }

  // Never derive the storage key from the client-supplied filename (path
  // traversal / injection risk) - the original name is kept in
  // original_filename below for display/download purposes only.
  const storagePath = `${params.uploadedBy}/${crypto.randomUUID()}`;

  const { error: uploadError } = await admin.storage
    .from("media")
    .upload(storagePath, buffer, { contentType: params.file.type || "application/octet-stream" });
  if (uploadError) throw uploadError;

  const { data, error } = await admin
    .from("media_files")
    .insert({
      storage_bucket: "media",
      storage_path: storagePath,
      file_type: fileType,
      original_filename: params.file.name,
      size_bytes: params.file.size,
      uploaded_by: params.uploadedBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listMediaFiles() {
  const admin = createAdminClient();
  const { data, error } = await admin.from("media_files").select("*").order("created_at", { ascending: false });
  if (error) throw error;

  // The "media" bucket is public (Section 17 - everything in it is meant to
  // be pasted as a permanent link into a public field: course/bundle covers,
  // teacher photos, banners), so this is a stable URL, not a signed one that
  // would expire minutes after being copied into one of those fields.
  return (data ?? []).map((file) => {
    const {
      data: { publicUrl },
    } = admin.storage.from(file.storage_bucket).getPublicUrl(file.storage_path);
    return { ...file, url: publicUrl };
  });
}

export async function renameMediaFile(id: string, newName: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("media_files")
    .update({ original_filename: newName })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteMediaFile(id: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: file } = await admin
    .from("media_files")
    .select("storage_bucket, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!file) return false;

  await admin.storage.from(file.storage_bucket).remove([file.storage_path]);
  const { error } = await admin.from("media_files").delete().eq("id", id);
  if (error) throw error;
  return true;
}
