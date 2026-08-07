import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { listMediaFiles, uploadMediaFile, MediaValidationError } from "@/lib/services/media-library.service";

const MANAGE_ROLES = ["admin", "super_admin", "content_manager"];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const files = await listMediaFiles();
  return apiSuccess(files, "تم جلب ملفات المكتبة");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) return apiError("لازم ترفع ملف باسم file", null, 400);

  try {
    const uploaded = await uploadMediaFile({ file, uploadedBy: user.id });
    return apiSuccess(uploaded, "تم رفع الملف", 201);
  } catch (error) {
    if (error instanceof MediaValidationError) return apiError(error.message, null, 422);
    throw error;
  }
}
