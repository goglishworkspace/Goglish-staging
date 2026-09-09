import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLessonSchema } from "@/lib/validation/lesson.schemas";
import { canUserManageModule } from "@/lib/services/course-permission.service";

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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: moduleId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const authorized = await canUserManageModule(user.id, moduleId);
  if (!authorized) {
    return apiError("الوحدة غير موجودة أو ليس لديك صلاحية لتعديل ترتيبها", null, 403);
  }

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.lesson_ids) || body.lesson_ids.length === 0) {
    return apiError("قائمة معرفات الدروس غير صالحة", null, 400);
  }

  const admin = createAdminClient();
  const lessonIds: string[] = body.lesson_ids;

  const updatePromises = lessonIds.map((lessonId, index) =>
    admin
      .from("lessons")
      .update({ order_index: index, updated_at: new Date().toISOString() })
      .eq("id", lessonId)
      .eq("module_id", moduleId)
  );

  const results = await Promise.all(updatePromises);
  const hasError = results.some((r) => r.error);
  if (hasError) {
    return apiError("تعذر حفظ الترتيب الجديد للدروس", null, 500);
  }

  const { data: updatedLessons, error: fetchError } = await admin
    .from("lessons")
    .select(LESSON_LIST_COLUMNS)
    .eq("module_id", moduleId)
    .is("deleted_at", null)
    .order("order_index");

  if (fetchError) {
    return apiError("تعذر جلب الدروس بعد إعادة الترتيب", null, 500);
  }

  return apiSuccess(updatedLessons, "تم تحديث ترتيب الدروس بنجاح");
}
