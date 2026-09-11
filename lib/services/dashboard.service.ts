import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getCourseProgressForStudent,
  type CourseProgress,
  type CourseEntitlementWithCourse,
} from "@/lib/services/course-progress.service";
import { getAllLevels, resolveLevelForXp } from "@/lib/services/level.service";

async function getEntitledCourses(
  supabase: SupabaseClient,
  userId: string,
): Promise<CourseEntitlementWithCourse[]> {
  const { data } = await supabase
    .from("course_entitlements")
    .select("course_id, courses(title, slug, cover_image_url, description)")
    .eq("user_id", userId)
    .is("revoked_at", null);
  return (data ?? []) as unknown as CourseEntitlementWithCourse[];
}

async function getModulesForCourses(
  supabase: SupabaseClient,
  courseIds: string[],
): Promise<Array<{ id: string; course_id: string }>> {
  if (!courseIds.length) return [];
  const { data } = await supabase.from("modules").select("id, course_id").in("course_id", courseIds);
  return (data ?? []) as Array<{ id: string; course_id: string }>;
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

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, title, lesson_id, lessons!inner(module_id)")
    .in("lessons.module_id", moduleIds)
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

  const firstUnattempted = quizzes.find((quiz) => !attemptedIds.has(quiz.id));
  if (!firstUnattempted) return null;

  return {
    id: firstUnattempted.id,
    title: firstUnattempted.title,
    lesson_id: firstUnattempted.lesson_id,
  };
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

/**
 * Fetches the last 56 days of XP transactions in a single query and computes
 * both the daily 7-day series and the weekly 8-week series in memory,
 * preserving exact date boundaries, Arabic day names, and ISO week keys.
 */
async function getXpProgress(supabase: SupabaseClient, userId: string) {
  const now = new Date();

  // Weekly range: last 8 ISO weeks (56 days)
  const weeklySince = new Date(now);
  weeklySince.setDate(weeklySince.getDate() - 7 * 8);

  // Daily range: last 6 days up to today (7-day continuous series starting at midnight)
  const dailySince = new Date(now);
  dailySince.setDate(dailySince.getDate() - 6);
  dailySince.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("xp_transactions")
    .select("amount, created_at")
    .eq("user_id", userId)
    .gte("created_at", weeklySince.toISOString());

  const arabicDays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const dailyBuckets = new Map<string, number>();

  const weekKey = (iso: string) => {
    const d = new Date(iso);
    const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    const dayMs = 86400000;
    const week = Math.ceil(((d.getTime() - jan4.getTime()) / dayMs + jan4.getUTCDay() + 1) / 7);
    return `${d.getUTCFullYear()}-W${week}`;
  };
  const weeklyBuckets = new Map<string, number>();

  const dailySinceTime = dailySince.getTime();

  for (const row of data ?? []) {
    const createdAtStr = row.created_at as string;
    const rowDate = new Date(createdAtStr);
    const amount = row.amount as number;

    // Weekly bucket (all rows in the 56-day window)
    const wKey = weekKey(createdAtStr);
    weeklyBuckets.set(wKey, (weeklyBuckets.get(wKey) ?? 0) + amount);

    // Daily bucket (only rows in the 7-day window)
    if (rowDate.getTime() >= dailySinceTime) {
      const dateKey = `${rowDate.getFullYear()}-${String(rowDate.getMonth() + 1).padStart(2, "0")}-${String(rowDate.getDate()).padStart(2, "0")}`;
      dailyBuckets.set(dateKey, (dailyBuckets.get(dateKey) ?? 0) + amount);
    }
  }

  // Generate the 7-day daily series in original order (6 days ago -> today)
  const daily_progress: { date: string; day_name: string; formatted_date: string; xp: number; is_today: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const isToday = i === 0;
    const dayName = isToday ? "اليوم" : arabicDays[d.getDay()];
    const formattedDate = `${d.getDate()}/${d.getMonth() + 1}`;

    daily_progress.push({
      date: dateKey,
      day_name: dayName,
      formatted_date: formattedDate,
      xp: dailyBuckets.get(dateKey) ?? 0,
      is_today: isToday,
    });
  }

  // Generate the weekly series sorted chronologically
  const weekly_progress = Array.from(weeklyBuckets.entries())
    .map(([week, xp]) => ({ week, xp }))
    .sort((a, b) => (a.week < b.week ? -1 : 1));

  return { daily_progress, weekly_progress };
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

  let query = supabase
    .from("courses")
    .select("id, title, slug, cover_image_url, subjects!inner(grades!inner(slug))")
    .eq("subjects.grades.slug", grade)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(6);
  if (ownedCourseIds.length) query = query.not("id", "in", `(${ownedCourseIds.join(",")})`);

  const { data } = await query;
  return (data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    cover_image_url: c.cover_image_url,
  }));
}

export type StudentDashboard = {
  continue_learning: Awaited<ReturnType<typeof getContinueLearning>>;
  latest_lesson: Awaited<ReturnType<typeof getLatestLesson>>;
  upcoming_quiz: Awaited<ReturnType<typeof getUpcomingQuiz>>;
  upcoming_exam: Awaited<ReturnType<typeof getUpcomingExam>>;
  daily_progress: Awaited<ReturnType<typeof getXpProgress>>["daily_progress"];
  weekly_progress: Awaited<ReturnType<typeof getXpProgress>>["weekly_progress"];
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
  // Round 1: Initiate all user-scoped independent queries immediately in parallel
  const profilePromise = supabase
    .from("profiles")
    .select("xp_total, coins_total, current_streak_days, longest_streak_days, grade")
    .eq("id", userId)
    .single()
    .then((r) => r.data);
  const entitlementsPromise = getEntitledCourses(supabase, userId);
  const levelsPromise = getAllLevels();

  const continueLearningPromise = getContinueLearning(supabase, userId);
  const xpProgressPromise = getXpProgress(supabase, userId);
  const rankPromise = getMyRank(supabase, userId);
  const badgesPromise = supabase
    .from("user_badges")
    .select("awarded_at, badges(id, code, title, description, icon)")
    .eq("user_id", userId)
    .order("awarded_at", { ascending: false })
    .limit(6);
  const certificatesPromise = supabase
    .from("certificates")
    .select("id, exam_id, certificate_number, issued_at, exams(title)")
    .eq("user_id", userId)
    .order("issued_at", { ascending: false })
    .limit(6);
  const notificationsPromise = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);
  const continueWatchingPromise = supabase
    .from("recently_viewed_courses")
    .select("course_id, viewed_at, courses(id, title, slug, cover_image_url)")
    .eq("user_id", userId)
    .order("viewed_at", { ascending: false })
    .limit(5);

  // Round 2: Await entitlements to obtain courseIds
  const entitlements = await entitlementsPromise;
  const courseIds = entitlements.map((row) => row.course_id);

  // Queries depending on courseIds
  const modulesPromise = getModulesForCourses(supabase, courseIds);
  const upcomingExamPromise = getUpcomingExam(supabase, userId, courseIds);
  const recommendedCoursesPromise = profilePromise.then((p) =>
    getRecommendedCourses(supabase, p?.grade ?? null, courseIds),
  );

  // Round 3: Await modules to obtain moduleIds and pass prefetched modules to course progress
  const modules = await modulesPromise;
  const moduleIds = modules.map((m) => m.id);

  // Queries depending on moduleIds (reusing prefetched modules in courseProgress)
  const latestLessonPromise = getLatestLesson(supabase, moduleIds);
  const upcomingQuizPromise = getUpcomingQuiz(supabase, userId, moduleIds);
  const courseProgressPromise = getCourseProgressForStudent(supabase, userId, entitlements, modules);

  const [
    profile,
    levels,
    continue_learning,
    latest_lesson,
    upcoming_quiz,
    upcoming_exam,
    xpProgress,
    course_progress,
    current_rank,
    badgesRes,
    certificatesRes,
    notificationsRes,
    continueWatchingRes,
    recommended_courses,
  ] = await Promise.all([
    profilePromise,
    levelsPromise,
    continueLearningPromise,
    latestLessonPromise,
    upcomingQuizPromise,
    upcomingExamPromise,
    xpProgressPromise,
    courseProgressPromise,
    rankPromise,
    badgesPromise,
    certificatesPromise,
    notificationsPromise,
    continueWatchingPromise,
    recommendedCoursesPromise,
  ]);

  return {
    continue_learning,
    latest_lesson,
    upcoming_quiz,
    upcoming_exam,
    daily_progress: xpProgress.daily_progress,
    weekly_progress: xpProgress.weekly_progress,
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
