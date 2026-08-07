import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyFileMagicBytes, hasMagicByteSignature } from "@/lib/services/file-validation.service";

const RESOURCE_COLUMNS = "id, title, file_type, file_size_bytes, created_at";
const MAX_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/zip",
  "audio/mpeg",
];

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lesson_resources")
    .select(RESOURCE_COLUMNS)
    .eq("lesson_id", id)
    .order("created_at", { ascending: false });

  if (error) return apiError("تعذر جلب الموارد", null, 500);
  return apiSuccess(data, "تم جلب الموارد");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const formData = await request.formData().catch(() => null);
  if (!formData) return apiError("جسم الطلب غير صالح", null, 400);

  const file = formData.get("file");
  const title = formData.get("title");
  if (!(file instanceof File) || typeof title !== "string" || !title.trim()) {
    return apiError("لازم ترفع ملف وتحدد عنوان", null, 422);
  }
  if (file.size > MAX_SIZE_BYTES) {
    return apiError("حجم الملف أكبر من الحد المسموح (50 ميجا)", null, 422);
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return apiError("نوع الملف غير مسموح", null, 422);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // file.type is client-supplied and trivially spoofed (e.g. an .html file
  // renamed with an image MIME type) - only reject when we actually know
  // what the declared type's bytes should look like; zip/audio have no
  // signature here and pass through as before.
  if (hasMagicByteSignature(file.type) && !(await verifyFileMagicBytes(buffer, file.type))) {
    return apiError("محتوى الملف مش متطابق مع نوعه المعلن", null, 422);
  }

  // Never derive the storage key from the client-supplied filename (path
  // traversal / injection risk) - the original name is kept in
  // original_filename below for display/download purposes only.
  const storagePath = `${id}/${crypto.randomUUID()}`;
  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage
    .from("lesson-resources")
    .upload(storagePath, buffer, { contentType: file.type });
  if (uploadError) return apiError("تعذر رفع الملف", null, 500);

  const { data, error } = await supabase
    .from("lesson_resources")
    .insert({
      lesson_id: id,
      title: title.trim(),
      storage_path: storagePath,
      file_type: file.type,
      file_size_bytes: file.size,
      original_filename: file.name,
      created_by: user.id,
    })
    .select(RESOURCE_COLUMNS)
    .single();

  if (error) {
    await admin.storage.from("lesson-resources").remove([storagePath]);
    return apiError("تعذر حفظ بيانات المورد (مش مسموح لك تضيف موارد للدرس ده)", null, 403);
  }

  return apiSuccess(data, "تم رفع المورد", 201);
}
