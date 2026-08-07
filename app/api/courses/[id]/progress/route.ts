import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

/** Course progress = aggregation over lesson_progress, no stored table (Section: Course Progress Tracking). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id, modules!inner(course_id)")
    .eq("modules.course_id", id)
    .eq("status", "published");

  if (lessonsError) return apiError("تعذر حساب تقدم الكورس", null, 500);

  const lessonIds = (lessons ?? []).map((l) => l.id);
  if (lessonIds.length === 0) {
    return apiSuccess(
      { total_lessons: 0, completed_lessons: 0, percent: 0, completed_lesson_ids: [] },
      "تم حساب تقدم الكورس",
    );
  }

  const { data: progress, error: progressError } = await supabase
    .from("lesson_progress")
    .select("lesson_id, status")
    .eq("user_id", user.id)
    .in("lesson_id", lessonIds);

  if (progressError) return apiError("تعذر حساب تقدم الكورس", null, 500);

  const completedLessonIds = (progress ?? []).filter((p) => p.status === "completed").map((p) => p.lesson_id);
  const percent = Math.round((completedLessonIds.length / lessonIds.length) * 100);

  return apiSuccess(
    { total_lessons: lessonIds.length, completed_lessons: completedLessonIds.length, percent, completed_lesson_ids: completedLessonIds },
    "تم حساب تقدم الكورس",
  );
}
