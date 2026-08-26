import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { userHasAnyRole } from "@/lib/auth/require-role";
import { renameMediaFileSchema } from "@/lib/validation/media.schemas";
import { renameMediaFile, deleteMediaFile } from "@/lib/services/media-library.service";

const MANAGE_ROLES = ["admin", "super_admin", "content_manager"];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = renameMediaFileSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const updated = await renameMediaFile(id, parsed.data.original_filename);
  if (!updated) return apiError("الملف غير موجود", null, 404);
  return apiSuccess(updated, "تم تغيير اسم الملف");
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);
  if (!(await userHasAnyRole(supabase, MANAGE_ROLES))) {
    return apiError("مش مسموح لك بالإجراء ده", null, 403);
  }

  const deleted = await deleteMediaFile(id);
  if (!deleted) return apiError("الملف غير موجود", null, 404);
  return apiSuccess(null, "تم حذف الملف");
}
