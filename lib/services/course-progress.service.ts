import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CourseProgress = {
  course_id: string;
  course_title: string;
  total_lessons: number;
  completed_lessons: number;
  completion_percent: number;
  watch_time_seconds: number;
};

async function computeCourseProgress(
  supabase: SupabaseClient,
  studentId: string,
  courseId: string,
  courseTitle: string,
): Promise<CourseProgress> {
  const { data: modules } = await supabase.from("modules").select("id").eq("course_id", courseId);
  const moduleIds = (modules ?? []).map((m) => m.id as string);

  let totalLessons = 0;
  let completedLessons = 0;
  let watchTimeSeconds = 0;
  if (moduleIds.length) {
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id")
      .in("module_id", moduleIds)
      .eq("status", "published")
      .is("deleted_at", null);
    const lessonIds = (lessons ?? []).map((l) => l.id as string);
    totalLessons = lessonIds.length;

    if (lessonIds.length) {
      const { data: progress } = await supabase
        .from("lesson_progress")
        .select("status, progress_seconds")
        .eq("user_id", studentId)
        .in("lesson_id", lessonIds);
      completedLessons = (progress ?? []).filter((p) => p.status === "completed").length;
      watchTimeSeconds = (progress ?? []).reduce((sum, p) => sum + (p.progress_seconds as number), 0);
    }
  }

  return {
    course_id: courseId,
    course_title: courseTitle,
    total_lessons: totalLessons,
    completed_lessons: completedLessons,
    completion_percent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
    watch_time_seconds: watchTimeSeconds,
  };
}

/** Progress across every course the student is entitled to (Section 13
 * Parent Portal). Extracted from parent-portal.service.ts so review
 * eligibility (Section 20) can reuse the exact same completion math. */
export async function getCourseProgressForStudent(
  supabase: SupabaseClient,
  studentId: string,
): Promise<CourseProgress[]> {
  const { data: entitlements } = await supabase
    .from("course_entitlements")
    .select("course_id, courses(title)")
    .eq("user_id", studentId)
    .is("revoked_at", null);

  const results: CourseProgress[] = [];
  for (const entitlement of entitlements ?? []) {
    const course = entitlement.courses as unknown as { title: string } | null;
    results.push(
      await computeCourseProgress(supabase, studentId, entitlement.course_id as string, course?.title ?? ""),
    );
  }
  return results;
}

/** Section 20 review eligibility - "بعد إنهاء الكورس": every published
 * lesson in the course has a completed lesson_progress row for this user. */
export async function hasCompletedCourse(
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
): Promise<boolean> {
  const { data: course } = await supabase.from("courses").select("title").eq("id", courseId).maybeSingle();
  const progress = await computeCourseProgress(supabase, userId, courseId, course?.title ?? "");
  return progress.total_lessons > 0 && progress.completed_lessons === progress.total_lessons;
}
