import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CourseProgressSummary, LessonProgress } from "@/lib/api/queries/lesson-progress";
import type { LessonNote } from "@/lib/api/queries/lesson-notes";

export async function getCourseProgressSummary(
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
): Promise<CourseProgressSummary> {
  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id, order_index, modules!inner(course_id, order_index)")
    .eq("modules.course_id", courseId)
    .eq("status", "published");

  if (lessonsError || !lessons?.length) {
    return {
      total_lessons: 0,
      completed_lessons: 0,
      percent: 0,
      completed_lesson_ids: [],
      next_lesson_id: null,
    };
  }

  const orderedLessons = (lessons ?? []).slice().sort((a, b) => {
    const moduleA = Array.isArray(a.modules) ? a.modules[0] : a.modules;
    const moduleB = Array.isArray(b.modules) ? b.modules[0] : b.modules;
    const moduleOrderDiff = (moduleA?.order_index ?? 0) - (moduleB?.order_index ?? 0);
    return moduleOrderDiff !== 0 ? moduleOrderDiff : a.order_index - b.order_index;
  });
  const lessonIds = orderedLessons.map((l) => l.id);

  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("lesson_id, status")
    .eq("user_id", userId)
    .in("lesson_id", lessonIds);

  const completedLessonIds = (progress ?? []).filter((p) => p.status === "completed").map((p) => p.lesson_id);
  const completedSet = new Set(completedLessonIds);
  const percent = Math.round((completedLessonIds.length / lessonIds.length) * 100);
  const nextLessonId = orderedLessons.find((l) => !completedSet.has(l.id))?.id ?? orderedLessons[0].id;

  return {
    total_lessons: lessonIds.length,
    completed_lessons: completedLessonIds.length,
    percent,
    completed_lesson_ids: completedLessonIds,
    next_lesson_id: nextLessonId,
  };
}

export async function getLessonProgress(
  supabase: SupabaseClient,
  userId: string,
  lessonId: string,
): Promise<LessonProgress> {
  const { data } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("lesson_id", lessonId)
    .eq("user_id", userId)
    .maybeSingle();

  return data ?? null;
}

export async function getLessonNotes(
  supabase: SupabaseClient,
  userId: string,
  lessonId: string,
): Promise<LessonNote[]> {
  const { data } = await supabase
    .from("lesson_notes")
    .select("id, timestamp_seconds, content, created_at, updated_at")
    .eq("lesson_id", lessonId)
    .eq("user_id", userId)
    .order("timestamp_seconds", { ascending: true });

  return data ?? [];
}
