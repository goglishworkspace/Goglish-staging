import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { updateLessonNoteSchema } from "@/lib/validation/lesson-note.schemas";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const { noteId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = updateLessonNoteSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data, error } = await supabase
    .from("lesson_notes")
    .update(parsed.data)
    .eq("id", noteId)
    .eq("user_id", user.id)
    .select("id, timestamp_seconds, content, created_at, updated_at")
    .maybeSingle();

  if (error) return apiError("تعذر تعديل النوتة", null, 400);
  if (!data) return apiError("النوتة غير موجودة", null, 404);
  return apiSuccess(data, "تم تعديل النوتة");
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const { noteId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { error, count } = await supabase
    .from("lesson_notes")
    .delete({ count: "exact" })
    .eq("id", noteId)
    .eq("user_id", user.id);

  if (error) return apiError("تعذر حذف النوتة", null, 400);
  if (!count) return apiError("النوتة غير موجودة", null, 404);
  return apiSuccess(null, "تم حذف النوتة");
}
