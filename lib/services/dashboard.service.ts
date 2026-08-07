import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCourseProgressForStudent, type CourseProgress } from "@/lib/services/course-progress.service";
import { getAllLevels, resolveLevelForXp } from "@/lib/services/level.service";

async function getEntitledCourseIds(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const { data } = await supabase
    .from("course_entitlements")
    .select("course_id")
    .eq("user_id", userId)
    .is("revoked_at", null);
  return (data ?? []).map((row) => row.course_id as string);
}

async function getModuleIdsForCourses(supabase: SupabaseClient, courseIds: string[]): Promise<string[]> {
  if (!courseIds.length) return [];
  const { data } = await supabase.from("modules").select("id").in("course_id", courseIds);
  return (data ?? []).map((row) => row.id as string);
}

async function getContinueLearning(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("lesson_progress")
    .select("lesson_id, progress_seconds, last_watched_at, lessons(id, title, module_id)")
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .order("last_watched_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function getLatestLesson(supabase: SupabaseClient, moduleIds: string[]) {
  if (!moduleIds.length) return null;
  const { data } = await supabase
    .from("lessons")
    .select("id, title, module_id, created_at")
    .in("module_id", moduleIds)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function getUpcomingQuiz(supabase: SupabaseClient, userId: string, moduleIds: string[]) {
  if (!moduleIds.length) return null;
  const { data: lessons } = await supabase.from("lessons").select("id").in("module_id", moduleIds);
  const lessonIds = (lessons ?? []).map((l) => l.id as string);
  if (!lessonIds.length) return null;

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, title, lesson_id")
    .in("lesson_id", lessonIds)
    .eq("kind", "quiz")
    .eq("status", "published");
  if (!quizzes?.length) return null;

  const { data: attempted } = await supabase
    .from("student_quiz_attempts")
    .select("quiz_id")
    .eq("user_id", userId)
    .eq("status", "submitted")
    .in("quiz_id", quizzes.map((q) => q.id));
  const attemptedIds = new Set((attempted ?? []).map((a) => a.quiz_id as string));

  return quizzes.find((quiz) => !attemptedIds.has(quiz.id)) ?? null;
}

async function getUpcomingExam(supabase: SupabaseClient, userId: string, courseIds: string[]) {
  if (!courseIds.length) return null;
  const { data: exams } = await supabase
    .from("exams")
    .select("id, title, course_id")
    .in("course_id", courseIds)
    .eq("status", "published");
  if (!exams?.length) return null;

  const { data: attempted } = await supabase
    .from("student_exam_attempts")
    .select("exam_id")
    .eq("user_id", userId)
    .in("exam_id", exams.map((e) => e.id));
  const attemptedIds = new Set((attempted ?? []).map((a) => a.exam_id as string));

  return exams.find((exam) => !attemptedIds.has(exam.id)) ?? null;
}

/** Buckets the last 8 ISO weeks of XP into a fixed-size series - no
 * pre-aggregated weekly view exists in xp_transactions, so this is computed
 * here rather than in SQL. */
async function getWeeklyProgress(supabase: SupabaseClient, userId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 7 * 8);

  const { data } = await supabase
    .from("xp_transactions")
    .select("amount, created_at")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());

  const weekKey = (iso: string) => {
    const d = new Date(iso);
    const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    const dayMs = 86400000;
    const week = Math.ceil(((d.getTime() - jan4.getTime()) / dayMs + jan4.getUTCDay() + 1) / 7);
    return `${d.getUTCFullYear()}-W${week}`;
  };

  const buckets = new Map<string, number>();
  for (const row of data ?? []) {
    const key = weekKey(row.created_at as string);
    buckets.set(key, (buckets.get(key) ?? 0) + (row.amount as number));
  }
  return Array.from(buckets.entries())
    .map(([week, xp]) => ({ week, xp }))
    .sort((a, b) => (a.week < b.week ? -1 : 1));
}

async function getMyRank(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("leaderboard_cache")
    .select("rank, xp")
    .eq("user_id", userId)
    .eq("scope", "global")
    .is("subject_id", null)
    .maybeSingle();
  return data ?? null;
}

async function getRecommendedCourses(supabase: SupabaseClient, grade: string | null, ownedCourseIds: string[]) {
  if (!grade) return [];
  const { data: gradeRow } = await supabase.from("grades").select("id").eq("slug", grade).maybeSingle();
  if (!gradeRow) return [];

  const { data: subjects } = await supabase.from("subjects").select("id").eq("grade_id", gradeRow.id);
  const subjectIds = (subjects ?? []).map((s) => s.id as string);
  if (!subjectIds.length) return [];

  let query = supabase
    .from("courses")
    .select("id, title, slug, cover_image_url")
    .in("subject_id", subjectIds)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(6);
  if (ownedCourseIds.length) query = query.not("id", "in", `(${ownedCourseIds.join(",")})`);

  const { data } = await query;
  return data ?? [];
}

export type StudentDashboard = {
  continue_learning: Awaited<ReturnType<typeof getContinueLearning>>;
  latest_lesson: Awaited<ReturnType<typeof getLatestLesson>>;
  upcoming_quiz: Awaited<ReturnType<typeof getUpcomingQuiz>>;
  upcoming_exam: Awaited<ReturnType<typeof getUpcomingExam>>;
  weekly_progress: Awaited<ReturnType<typeof getWeeklyProgress>>;
  course_progress: CourseProgress[];
  total_xp: number;
  coins_total: number;
  current_streak_days: number;
  longest_streak_days: number;
  level: Awaited<ReturnType<typeof resolveLevelForXp>>;
  current_rank: Awaited<ReturnType<typeof getMyRank>>;
  badges: unknown[];
  certificates: unknown[];
  recent_notifications: unknown[];
  continue_watching: unknown[];
  recommended_courses: Awaited<ReturnType<typeof getRecommendedCourses>>;
};

export async function getStudentDashboard(supabase: SupabaseClient, userId: string): Promise<StudentDashboard> {
  const [profile, courseIds] = await Promise.all([
    supabase
      .from("profiles")
      .select("xp_total, coins_total, current_streak_days, longest_streak_days, grade")
      .eq("id", userId)
      .single()
      .then((r) => r.data),
    getEntitledCourseIds(supabase, userId),
  ]);

  const moduleIds = await getModuleIdsForCourses(supabase, courseIds);
  const levels = await getAllLevels();

  const [
    continue_learning,
    latest_lesson,
    upcoming_quiz,
    upcoming_exam,
    weekly_progress,
    course_progress,
    current_rank,
    badgesRes,
    certificatesRes,
    notificationsRes,
    continueWatchingRes,
    recommended_courses,
  ] = await Promise.all([
    getContinueLearning(supabase, userId),
    getLatestLesson(supabase, moduleIds),
    getUpcomingQuiz(supabase, userId, moduleIds),
    getUpcomingExam(supabase, userId, courseIds),
    getWeeklyProgress(supabase, userId),
    getCourseProgressForStudent(supabase, userId),
    getMyRank(supabase, userId),
    supabase
      .from("user_badges")
      .select("awarded_at, badges(id, code, title, description, icon)")
      .eq("user_id", userId)
      .order("awarded_at", { ascending: false })
      .limit(6),
    supabase
      .from("certificates")
      .select("id, exam_id, certificate_number, issued_at, exams(title)")
      .eq("user_id", userId)
      .order("issued_at", { ascending: false })
      .limit(6),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("recently_viewed_courses")
      .select("course_id, viewed_at, courses(id, title, slug, cover_image_url)")
      .eq("user_id", userId)
      .order("viewed_at", { ascending: false })
      .limit(5),
    getRecommendedCourses(supabase, profile?.grade ?? null, courseIds),
  ]);

  return {
    continue_learning,
    latest_lesson,
    upcoming_quiz,
    upcoming_exam,
    weekly_progress,
    course_progress,
    total_xp: profile?.xp_total ?? 0,
    coins_total: profile?.coins_total ?? 0,
    current_streak_days: profile?.current_streak_days ?? 0,
    longest_streak_days: profile?.longest_streak_days ?? 0,
    level: resolveLevelForXp(levels, profile?.xp_total ?? 0),
    current_rank,
    badges: badgesRes.data ?? [],
    certificates: certificatesRes.data ?? [],
    recent_notifications: notificationsRes.data ?? [],
    continue_watching: continueWatchingRes.data ?? [],
    recommended_courses,
  };
}
