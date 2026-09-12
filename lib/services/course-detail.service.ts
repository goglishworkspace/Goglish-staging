import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasCourseAccess } from "@/lib/services/entitlement.service";
import { getDeletedUserIds } from "@/lib/services/teacher-visibility.service";
import type { CourseDetail } from "@/lib/api/queries/courses";
import type { CourseModule } from "@/lib/api/queries/modules";

const LESSON_NESTED_COLUMNS =
  "id, module_id, title, description, order_index, teacher_id, is_preview, status, " +
  "submitted_at, rejection_reason, youtube_preview_video_id, bunny_video_duration_seconds, " +
  "deletion_requested_at, deleted_at, created_at, updated_at";

export async function getCourseDetail(
  supabase: SupabaseClient,
  id: string,
  userId?: string | null,
): Promise<CourseDetail | null> {
  const { data, error } = await supabase
    .from("courses")
    .select("*, subjects(name, grades(name))")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;

  const has_access = userId ? await hasCourseAccess(supabase, userId, id) : false;

  const { data: teacherRows } = await supabase
    .from("course_teachers")
    .select("teachers(id, user_id, teacher_profiles(display_name))")
    .eq("course_id", id);

  const rawTeachers = (teacherRows ?? [])
    .map(
      (row) =>
        row.teachers as unknown as {
          id: string;
          user_id: string;
          teacher_profiles: { display_name: string | null } | null;
        } | null,
    )
    .filter((t): t is NonNullable<typeof t> => !!t);

  const deletedUserIds = await getDeletedUserIds(rawTeachers.map((t) => t.user_id));
  const teachers = rawTeachers
    .filter((t) => !deletedUserIds.has(t.user_id))
    .map((t) => ({ id: t.id, display_name: t.teacher_profiles?.display_name ?? null }));

  return { ...data, has_access, teachers } as unknown as CourseDetail;
}

export async function getCourseModulesWithLessons(
  supabase: SupabaseClient,
  courseId: string,
): Promise<CourseModule[]> {
  const { data, error } = await supabase
    .from("modules")
    .select(`
      id, course_id, title, order_index, deletion_requested_at, created_at, updated_at,
      lessons(${LESSON_NESTED_COLUMNS})
    `)
    .eq("course_id", courseId)
    .order("order_index");

  if (error || !data) return [];

  return data.map((mod) => {
    const rawLessons = (mod.lessons ?? []) as Array<{ order_index: number; deleted_at?: string | null }>;
    return {
      ...mod,
      lessons: rawLessons
        .filter((l) => !l.deleted_at)
        .sort((a, b) => a.order_index - b.order_index),
    };
  }) as unknown as CourseModule[];
}

export async function getCourseExams(
  supabase: SupabaseClient,
  courseId: string,
) {
  const { data, error } = await supabase
    .from("exams")
    .select(
      "id, course_id, title, time_limit_seconds, passing_score_percent, solutions_visible_at, xp_reward, coin_reward, status, deletion_requested_at, created_at",
    )
    .eq("course_id", courseId)
    .eq("status", "published");

  if (error || !data) return [];
  return data;
}

export async function getCourseReviews(
  supabase: SupabaseClient,
  courseId: string,
) {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, user_id, rating, comment, like_count, created_at")
    .eq("target_type", "course")
    .eq("target_id", courseId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data;
}

