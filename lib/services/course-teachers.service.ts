import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDeletedUserIds } from "./teacher-visibility.service";

export type CourseTeacher = { id: string; display_name: string | null };

/** Attaches each course's teacher roster (name/id, for display - "مين بيقدم
 * الكورس ده") via a two-step M:M lookup, rather than an embed -
 * course_teachers isn't a sibling-FK situation PostgREST can embed directly
 * off `courses`. Shared by GET /api/courses and GET /api/course-bundles
 * (a bundle's embedded courses need the same teacher roster CourseCard
 * expects everywhere else it's rendered). */
export async function attachTeachers<T extends { id: string }>(
  supabase: SupabaseClient,
  courses: T[],
): Promise<Array<T & { teachers: CourseTeacher[] }>> {
  if (!courses.length) return [];

  const { data: rows } = await supabase
    .from("course_teachers")
    .select("course_id, teachers(id, user_id, teacher_profiles(display_name))")
    .in(
      "course_id",
      courses.map((c) => c.id),
    );

  const teacherRows = (rows ?? []).map((row) => ({
    course_id: row.course_id,
    teacher: row.teachers as unknown as {
      id: string;
      user_id: string;
      teacher_profiles: { display_name: string | null } | null;
    } | null,
  }));
  const deletedUserIds = await getDeletedUserIds(
    teacherRows.map((row) => row.teacher?.user_id).filter((id): id is string => !!id),
  );

  const teachersByCourse = new Map<string, CourseTeacher[]>();
  for (const row of teacherRows) {
    const teacher = row.teacher;
    if (!teacher || deletedUserIds.has(teacher.user_id)) continue;
    const list = teachersByCourse.get(row.course_id) ?? [];
    list.push({ id: teacher.id, display_name: teacher.teacher_profiles?.display_name ?? null });
    teachersByCourse.set(row.course_id, list);
  }

  return courses.map((course) => ({ ...course, teachers: teachersByCourse.get(course.id) ?? [] }));
}

/** Same enrichment as attachTeachers(), but for bundles - each bundle carries
 * an embedded `bundle_courses[].courses` row (from the course_bundles ↔
 * courses join) that also needs a teacher roster so a bundle's course list
 * can render with the same CourseCard used everywhere else. Dedupes across
 * bundles first so a course shared by two bundles is only looked up once. */
export async function attachTeachersToBundles<
  B extends { bundle_courses: { course_id: string; courses: ({ id: string } & Record<string, unknown>) | null }[] },
>(supabase: SupabaseClient, bundles: B[]): Promise<B[]> {
  const courseMap = new Map<string, { id: string } & Record<string, unknown>>();
  for (const bundle of bundles) {
    for (const bc of bundle.bundle_courses) {
      if (bc.courses) courseMap.set(bc.course_id, bc.courses);
    }
  }

  const enriched = await attachTeachers(supabase, [...courseMap.values()]);
  const enrichedMap = new Map(enriched.map((course) => [course.id, course]));

  return bundles.map((bundle) => ({
    ...bundle,
    bundle_courses: bundle.bundle_courses.map((bc) => ({
      ...bc,
      courses: bc.courses ? (enrichedMap.get(bc.course_id) ?? bc.courses) : null,
    })),
  }));
}
