import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CourseProgress = {
  course_id: string;
  course_title: string;
  course_slug?: string | null;
  cover_image_url?: string | null;
  description?: string | null;
  total_lessons: number;
  completed_lessons: number;
  completion_percent: number;
  watch_time_seconds: number;
};

async function computeCourseProgress(
  supabase: SupabaseClient,
  studentId: string,
  courseId: string,
  courseInfo: {
    title: string;
    slug?: string | null;
    cover_image_url?: string | null;
    description?: string | null;
  },
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
    course_title: courseInfo.title,
    course_slug: courseInfo.slug ?? null,
    cover_image_url: courseInfo.cover_image_url ?? null,
    description: courseInfo.description ?? null,
    total_lessons: totalLessons,
    completed_lessons: completedLessons,
    completion_percent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
    watch_time_seconds: watchTimeSeconds,
  };
}

export type CourseEntitlementWithCourse = {
  course_id: string;
  courses: {
    title: string;
    slug?: string | null;
    cover_image_url?: string | null;
    description?: string | null;
  } | null;
};

/** Progress across every course the student is entitled to (Section 13
 * Parent Portal). Extracted from parent-portal.service.ts so review
 * eligibility (Section 20) can reuse the exact same completion math. */
export async function getCourseProgressForStudent(
  supabase: SupabaseClient,
  studentId: string,
  prefetchedEntitlements?: CourseEntitlementWithCourse[],
  prefetchedModules?: Array<{ id: string; course_id: string }>,
): Promise<CourseProgress[]> {
  let entitlements = prefetchedEntitlements;
  if (!entitlements) {
    const { data } = await supabase
      .from("course_entitlements")
      .select("course_id, courses(title, slug, cover_image_url, description)")
      .eq("user_id", studentId)
      .is("revoked_at", null);
    entitlements = (data ?? []) as unknown as CourseEntitlementWithCourse[];
  }

  if (!entitlements.length) return [];

  const courseIds = entitlements.map((e) => e.course_id);

  // 1. Batch fetch all modules for all courses in a single query (or use prefetched modules)
  let modules = prefetchedModules;
  if (!modules) {
    const { data } = await supabase
      .from("modules")
      .select("id, course_id")
      .in("course_id", courseIds);
    modules = (data ?? []) as Array<{ id: string; course_id: string }>;
  }

  const moduleToCourse = new Map<string, string>();
  for (const m of modules ?? []) {
    moduleToCourse.set(m.id as string, m.course_id as string);
  }
  const moduleIds = Array.from(moduleToCourse.keys());

  // 2. Batch fetch all published lessons for all modules in a single query
  const courseLessonCount = new Map<string, number>();
  const lessonToCourse = new Map<string, string>();

  if (moduleIds.length) {
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id, module_id")
      .in("module_id", moduleIds)
      .eq("status", "published")
      .is("deleted_at", null);

    for (const l of lessons ?? []) {
      const courseId = moduleToCourse.get(l.module_id as string);
      if (courseId) {
        courseLessonCount.set(courseId, (courseLessonCount.get(courseId) ?? 0) + 1);
        lessonToCourse.set(l.id as string, courseId);
      }
    }
  }

  // 3. Batch fetch progress for all relevant lessons in a single query
  const courseCompletedLessons = new Map<string, number>();
  const courseWatchTime = new Map<string, number>();
  const lessonIds = Array.from(lessonToCourse.keys());

  if (lessonIds.length) {
    const { data: progress } = await supabase
      .from("lesson_progress")
      .select("lesson_id, status, progress_seconds")
      .eq("user_id", studentId)
      .in("lesson_id", lessonIds);

    for (const p of progress ?? []) {
      const courseId = lessonToCourse.get(p.lesson_id as string);
      if (courseId) {
        if (p.status === "completed") {
          courseCompletedLessons.set(courseId, (courseCompletedLessons.get(courseId) ?? 0) + 1);
        }
        courseWatchTime.set(
          courseId,
          (courseWatchTime.get(courseId) ?? 0) + ((p.progress_seconds as number) || 0),
        );
      }
    }
  }

  // Assemble the result for each entitlement in original order
  return entitlements.map((entitlement) => {
    const courseId = entitlement.course_id;
    const course = entitlement.courses;
    const totalLessons = courseLessonCount.get(courseId) ?? 0;
    const completedLessons = courseCompletedLessons.get(courseId) ?? 0;
    const watchTimeSeconds = courseWatchTime.get(courseId) ?? 0;
    const completionPercent = totalLessons
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;

    return {
      course_id: courseId,
      course_title: course?.title ?? "",
      course_slug: course?.slug ?? null,
      cover_image_url: course?.cover_image_url ?? null,
      description: course?.description ?? null,
      total_lessons: totalLessons,
      completed_lessons: completedLessons,
      completion_percent: completionPercent,
      watch_time_seconds: watchTimeSeconds,
    };
  });
}

/** Section 20 review eligibility - "بعد إنهاء الكورس": every published
 * lesson in the course has a completed lesson_progress row for this user. */
export async function hasCompletedCourse(
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
): Promise<boolean> {
  const { data: course } = await supabase.from("courses").select("title, slug, cover_image_url, description").eq("id", courseId).maybeSingle();
  const progress = await computeCourseProgress(supabase, userId, courseId, {
    title: course?.title ?? "",
    slug: course?.slug ?? null,
    cover_image_url: course?.cover_image_url ?? null,
    description: course?.description ?? null,
  });
  return progress.total_lessons > 0 && progress.completed_lessons === progress.total_lessons;
}
