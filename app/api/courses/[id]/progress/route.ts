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
    .select("id, order_index, modules!inner(course_id, order_index)")
    .eq("modules.course_id", id)
    .eq("status", "published");

  if (lessonsError) return apiError("تعذر حساب تقدم الكورس", null, 500);

  // Curriculum order (module order, then lesson order within it) - this is
  // also what "متابعة التعلم" uses to pick which lesson to jump to below, so
  // it has to match the order the student actually sees in the module list.
  const orderedLessons = (lessons ?? []).slice().sort((a, b) => {
    const moduleA = Array.isArray(a.modules) ? a.modules[0] : a.modules;
    const moduleB = Array.isArray(b.modules) ? b.modules[0] : b.modules;
    const moduleOrderDiff = (moduleA?.order_index ?? 0) - (moduleB?.order_index ?? 0);
    return moduleOrderDiff !== 0 ? moduleOrderDiff : a.order_index - b.order_index;
  });
  const lessonIds = orderedLessons.map((l) => l.id);

  if (lessonIds.length === 0) {
    return apiSuccess(
      { total_lessons: 0, completed_lessons: 0, percent: 0, completed_lesson_ids: [], next_lesson_id: null },
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
  const completedSet = new Set(completedLessonIds);
  const percent = Math.round((completedLessonIds.length / lessonIds.length) * 100);
  // First lesson not yet completed, in curriculum order - once everything is
  // done there's no "next", so fall back to replaying from the start.
  const nextLessonId = orderedLessons.find((l) => !completedSet.has(l.id))?.id ?? orderedLessons[0].id;

  return apiSuccess(
    {
      total_lessons: lessonIds.length,
      completed_lessons: completedLessonIds.length,
      percent,
      completed_lesson_ids: completedLessonIds,
      next_lesson_id: nextLessonId,
    },
    "تم حساب تقدم الكورس",
  );
}
