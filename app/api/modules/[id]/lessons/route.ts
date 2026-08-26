import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createLessonSchema } from "@/lib/validation/lesson.schemas";

const LESSON_LIST_COLUMNS =
  "id, module_id, title, description, order_index, teacher_id, is_preview, status, submitted_at, rejection_reason, " +
  "youtube_preview_video_id, bunny_video_duration_seconds, deletion_requested_at, created_at, updated_at";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // youtube_video_id (the protected/paid video) and bunny_video_id are both
  // intentionally excluded from list responses - lessons RLS only gates on
  // published/draft status, not purchase, so including either here would let
  // anyone who can see a published lesson's row read the real video id
  // straight off this endpoint, bypassing the purchase check entirely.
  // Playback only ever happens through /api/lessons/[id]/playback, which
  // does check course access before returning it.
  const { data, error } = await supabase
    .from("lessons")
    .select(LESSON_LIST_COLUMNS)
    .eq("module_id", id)
    .is("deleted_at", null)
    .order("order_index");

  if (error) return apiError("تعذر جلب الدروس", null, 500);
  return apiSuccess(data, "تم جلب الدروس");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = createLessonSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data, error } = await supabase
    .from("lessons")
    .insert({ ...parsed.data, module_id: id, created_by: user.id })
    .select(LESSON_LIST_COLUMNS)
    .single();

  if (error) return apiError("تعذر إنشاء الدرس (لازم تكون من فريق تدريس الكورس أو أدمن)", null, 403);
  return apiSuccess(data, "تم إنشاء الدرس", 201);
}
