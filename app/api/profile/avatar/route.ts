import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { uploadAvatar, deleteAvatar } from "@/lib/services/avatar.service";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) return apiError("لازم ترفع صورة باسم file", null, 400);

  const result = await uploadAvatar(user.id, file);
  if (!result.ok) {
    const message =
      result.reason === "invalid_type"
        ? "لازم تكون الصورة JPEG أو PNG أو WebP"
        : result.reason === "content_mismatch"
          ? "محتوى الملف مش متطابق مع نوعه - جرب صورة تانية"
          : "حجم الصورة أكبر من 5 ميجا";
    return apiError(message, null, 422);
  }

  return apiSuccess({ avatar_url: result.avatarUrl }, "تم رفع الصورة الشخصية");
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  await deleteAvatar(user.id);
  return apiSuccess(null, "تم حذف الصورة الشخصية");
}
