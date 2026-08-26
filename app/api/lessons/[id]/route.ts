import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { updateLessonSchema } from "@/lib/validation/lesson.schemas";

// youtube_video_id (the protected/paid video) is intentionally excluded, same
// reasoning as modules/[id]/lessons/route.ts - it's still writable via PATCH
// below (updateLessonSchema includes it), just never echoed back here.
const LESSON_COLUMNS =
  "id, module_id, title, description, order_index, teacher_id, is_preview, status, " +
  "rejection_reason, youtube_preview_video_id, bunny_video_duration_seconds, " +
  "created_by, reviewed_by, reviewed_at, created_at, updated_at";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lessons")
    .select(LESSON_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return apiError("تعذر جلب الدرس", null, 500);
  if (!data) return apiError("الدرس غير موجود", null, 404);
  return apiSuccess(data, "تم جلب الدرس");
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = updateLessonSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  let isAdmin = false;
  try {
    const { data: roleCheck } = await supabase.rpc("user_has_any_role", {
      p_roles: ["admin", "super_admin", "moderator", "content_manager"],
    });
    isAdmin = !!roleCheck;
  } catch {
    isAdmin = false;
  }

  const updatePayload: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  if (!isAdmin) {
    updatePayload.submitted_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("lessons")
    .update(updatePayload)
    .eq("id", id)
    .select(LESSON_COLUMNS)
    .maybeSingle();

  if (error) return apiError("تعذر تحديث الدرس", null, 400);
  if (!data) return apiError("الدرس غير موجود أو ليس لديك صلاحية تعديله", null, 403);
  return apiSuccess(data, isAdmin ? "تم تحديث الدرس" : "تم حفظ التعديلات وإرسالها للمراجعة");
}

// Soft delete only (Section 23).
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data, error } = await supabase
    .from("lessons")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return apiError("تعذر حذف الدرس", null, 400);
  if (!data) return apiError("الدرس غير موجود أو مش مسموح تحذفه", null, 403);
  return apiSuccess(null, "تم حذف الدرس");
}
