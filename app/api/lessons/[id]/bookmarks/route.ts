import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { createLessonBookmarkSchema } from "@/lib/validation/lesson-note.schemas";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data, error } = await supabase
    .from("lesson_bookmarks")
    .select("id, timestamp_seconds, label, created_at")
    .eq("lesson_id", id)
    .eq("user_id", user.id)
    .order("timestamp_seconds", { ascending: true });

  if (error) return apiError("تعذر جلب العلامات المرجعية", null, 500);
  return apiSuccess(data, "تم جلب العلامات المرجعية");
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
  const parsed = createLessonBookmarkSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { data, error } = await supabase
    .from("lesson_bookmarks")
    .insert({ lesson_id: id, user_id: user.id, ...parsed.data })
    .select("id, timestamp_seconds, label, created_at")
    .single();

  if (error) return apiError("تعذر إضافة العلامة المرجعية", null, 400);
  return apiSuccess(data, "تم إضافة العلامة المرجعية", 201);
}
