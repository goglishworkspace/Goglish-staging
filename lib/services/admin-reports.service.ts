import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCourseProgressForStudent } from "./course-progress.service";
import { getLevelForXp } from "./level.service";
import { TeacherNotFoundError } from "./admin-user-management.service";

/** Section 15 - Admin Dashboard summary counts. */
export async function getDashboardStats() {
  const admin = createAdminClient();

  const [
    { count: studentsCount },
    { count: teachersCount },
    { count: coursesCount },
    { count: publishedCoursesCount },
    { count: activeSubscriptionsCount },
    { count: pendingCommentsCount },
    { count: pendingContentCount },
    { data: revenueRows },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).is("deleted_at", null),
    admin.from("teachers").select("id", { count: "exact", head: true }),
    admin.from("courses").select("id", { count: "exact", head: true }).is("deleted_at", null),
    admin
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .is("deleted_at", null),
    admin
      .from("user_subscriptions")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "grace_period"]),
    admin.from("lesson_comments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft")
      .not("submitted_at", "is", null),
    admin.from("orders").select("total_cents").eq("status", "completed"),
  ]);

  const totalRevenueCents = (revenueRows ?? []).reduce((sum, row) => sum + (row.total_cents as number), 0);

  return {
    students_count: studentsCount ?? 0,
    teachers_count: teachersCount ?? 0,
    courses_count: coursesCount ?? 0,
    published_courses_count: publishedCoursesCount ?? 0,
    active_subscriptions_count: activeSubscriptionsCount ?? 0,
    pending_comments_count: pendingCommentsCount ?? 0,
    pending_content_reviews_count: pendingContentCount ?? 0,
    total_revenue_cents: totalRevenueCents,
  };
}

/** Section 37 - Financial Reports. `from`/`to` are optional ISO datetime
 * bounds on orders.created_at. */
export async function getFinancialReport(from: string | null, to: string | null) {
  const admin = createAdminClient();

  let ordersQuery = admin.from("orders").select("status, subtotal_cents, discount_cents, tax_cents, total_cents");
  if (from) ordersQuery = ordersQuery.gte("created_at", from);
  if (to) ordersQuery = ordersQuery.lte("created_at", to);
  const { data: orders } = await ordersQuery;

  const completedOrders = (orders ?? []).filter((o) => o.status === "completed");
  const revenueCents = completedOrders.reduce((sum, o) => sum + (o.total_cents as number), 0);
  const taxCents = completedOrders.reduce((sum, o) => sum + (o.tax_cents as number), 0);
  const discountCents = completedOrders.reduce((sum, o) => sum + (o.discount_cents as number), 0);
  const conversionRate = orders?.length ? completedOrders.length / orders.length : 0;

  let refundsQuery = admin.from("refunds").select("amount_cents, status");
  if (from) refundsQuery = refundsQuery.gte("created_at", from);
  if (to) refundsQuery = refundsQuery.lte("created_at", to);
  const { data: refunds } = await refundsQuery;
  const refundsCents = (refunds ?? [])
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + (r.amount_cents as number), 0);

  const { count: invoicesCount } = await admin.from("invoices").select("id", { count: "exact", head: true });

  const { data: subscriptions } = await admin
    .from("user_subscriptions")
    .select("status, subscription_plans(kind)")
    .in("status", ["active", "grace_period"]);
  const subscriptionsByPlan: Record<string, number> = {};
  for (const sub of subscriptions ?? []) {
    const kind = (sub.subscription_plans as unknown as { kind: string } | null)?.kind ?? "unknown";
    subscriptionsByPlan[kind] = (subscriptionsByPlan[kind] ?? 0) + 1;
  }

  return {
    revenue_cents: revenueCents,
    tax_collected_cents: taxCents,
    discounts_given_cents: discountCents,
    refunds_cents: refundsCents,
    net_revenue_cents: revenueCents - refundsCents,
    invoices_count: invoicesCount ?? 0,
    orders_created: orders?.length ?? 0,
    orders_completed: completedOrders.length,
    conversion_rate: Math.round(conversionRate * 10000) / 10000,
    active_subscriptions_by_plan: subscriptionsByPlan,
  };
}

/** Section 37 - Student Reports. Study time/progress/grades reuse the same
 * course-progress math as the Parent Portal; adds device history (Section
 * 37) and the last login timestamp - true granular login *history* beyond
 * "most recent" isn't tracked anywhere except audit_logs('user.login')
 * going forward (wired in Phase 7 - see app/api/auth/login/route.ts), so
 * older logins from before this phase won't appear. */
export async function getStudentReport(studentId: string) {
  const admin = createAdminClient();

  const [{ data: profile }, courses, { data: quizAttempts }, { data: examAttempts }, { data: devices }, { data: authUser }, { data: loginHistory }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("first_name, last_name, xp_total, coins_total, current_streak_days, grade")
        .eq("id", studentId)
        .single(),
      getCourseProgressForStudent(admin, studentId),
      admin
        .from("student_quiz_attempts")
        .select("score_percent, passed, submitted_at")
        .eq("user_id", studentId)
        .eq("status", "submitted"),
      admin
        .from("student_exam_attempts")
        .select("score_percent, passed, submitted_at")
        .eq("user_id", studentId)
        .eq("status", "submitted"),
      admin
        .from("devices")
        .select("user_agent, ip_address, is_active, last_active_at, created_at")
        .eq("user_id", studentId)
        .order("last_active_at", { ascending: false }),
      admin.auth.admin.getUserById(studentId),
      admin
        .from("audit_logs")
        .select("created_at")
        .eq("actor_user_id", studentId)
        .eq("action", "user.login")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const level = await getLevelForXp(profile?.xp_total ?? 0);
  const totalWatchSeconds = courses.reduce((sum, c) => sum + c.watch_time_seconds, 0);

  return {
    student: { first_name: profile?.first_name, last_name: profile?.last_name, grade: profile?.grade },
    last_login_at: authUser?.user?.last_sign_in_at ?? null,
    login_history: (loginHistory ?? []).map((row) => row.created_at),
    device_history: devices ?? [],
    total_watch_time_seconds: totalWatchSeconds,
    courses,
    gamification: { xp_total: profile?.xp_total ?? 0, coins_total: profile?.coins_total ?? 0, level },
    quiz_scores: quizAttempts ?? [],
    exam_scores: examAttempts ?? [],
  };
}

/** Section 37 - Teacher Reports: their courses, per-course enrollment
 * (direct purchases only - platform-wide subscribers aren't "their"
 * students specifically), and revenue attributed to those courses. */
export async function getTeacherReport(teacherId: string) {
  const admin = createAdminClient();

  const { data: teacherProfile } = await admin
    .from("teacher_profiles")
    .select("display_name, rating_avg, rating_count")
    .eq("teacher_id", teacherId)
    .single();

  const { data: assignments } = await admin
    .from("course_teachers")
    .select("course_id, courses(id, title, status)")
    .eq("teacher_id", teacherId);

  const courses = [];
  let totalRevenueCents = 0;
  for (const assignment of assignments ?? []) {
    const course = assignment.courses as unknown as { id: string; title: string; status: string } | null;
    if (!course) continue;

    const [{ count: studentsCount }, { data: orders }] = await Promise.all([
      admin
        .from("course_entitlements")
        .select("id", { count: "exact", head: true })
        .eq("course_id", course.id)
        .is("revoked_at", null),
      admin.from("orders").select("total_cents").eq("item_type", "course").eq("item_id", course.id).eq("status", "completed"),
    ]);
    const courseRevenueCents = (orders ?? []).reduce((sum, o) => sum + (o.total_cents as number), 0);
    totalRevenueCents += courseRevenueCents;

    courses.push({
      course_id: course.id,
      title: course.title,
      status: course.status,
      students_count: studentsCount ?? 0,
      revenue_cents: courseRevenueCents,
    });
  }

  return {
    display_name: teacherProfile?.display_name ?? null,
    rating_avg: teacherProfile?.rating_avg ?? 0,
    rating_count: teacherProfile?.rating_count ?? 0,
    courses,
    total_revenue_cents: totalRevenueCents,
  };
}

/** Teacher Dashboard self-service equivalent of getTeacherReport. Originally
 * omitted revenue entirely per Section 6 ("لا يقدر يرى بيانات الدفع"), but the
 * product decision was reversed - teachers now see total + monthly revenue
 * for their own courses, same as getTeacherReport's admin view, plus the avg
 * completion/quiz-score aggregates the admin report doesn't compute. */
export async function getTeacherOwnReport(teacherUserId: string) {
  const admin = createAdminClient();

  const { data: teacher } = await admin.from("teachers").select("id").eq("user_id", teacherUserId).maybeSingle();
  if (!teacher) throw new TeacherNotFoundError("مفيش مدرس بالحساب ده");

  const { data: teacherProfile } = await admin
    .from("teacher_profiles")
    .select("display_name, rating_avg, rating_count")
    .eq("teacher_id", teacher.id)
    .single();

  const { data: assignments } = await admin
    .from("course_teachers")
    .select("course_id, courses(id, title, status)")
    .eq("teacher_id", teacher.id);

  const courseIds = (assignments ?? [])
    .map((a) => (a.courses as unknown as { id: string } | null)?.id)
    .filter((id): id is string => !!id);

  // Last 12 calendar months (oldest first), zero-filled so gaps show up in a
  // trend chart instead of being skipped.
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const revenueByMonth = new Map(months.map((m) => [m, 0]));
  let totalRevenueCents = 0;

  if (courseIds.length) {
    const { data: revenueOrders } = await admin
      .from("orders")
      .select("total_cents, created_at")
      .eq("item_type", "course")
      .in("item_id", courseIds)
      .eq("status", "completed");

    for (const order of revenueOrders ?? []) {
      const cents = order.total_cents as number;
      totalRevenueCents += cents;
      const month = (order.created_at as string).slice(0, 7);
      if (revenueByMonth.has(month)) revenueByMonth.set(month, revenueByMonth.get(month)! + cents);
    }
  }
  const monthlyRevenue = months.map((month) => ({ month, revenue_cents: revenueByMonth.get(month) ?? 0 }));

  const courses = [];
  for (const assignment of assignments ?? []) {
    const course = assignment.courses as unknown as { id: string; title: string; status: string } | null;
    if (!course) continue;

    const { data: entitlements } = await admin
      .from("course_entitlements")
      .select("user_id")
      .eq("course_id", course.id)
      .is("revoked_at", null);
    const studentIds = (entitlements ?? []).map((e) => e.user_id as string);

    const { data: modules } = await admin.from("modules").select("id").eq("course_id", course.id);
    const moduleIds = (modules ?? []).map((m) => m.id as string);
    let lessonIds: string[] = [];
    if (moduleIds.length) {
      const { data: lessons } = await admin.from("lessons").select("id").in("module_id", moduleIds);
      lessonIds = (lessons ?? []).map((l) => l.id as string);
    }
    let quizIds: string[] = [];
    if (lessonIds.length) {
      const { data: quizzes } = await admin.from("quizzes").select("id").in("lesson_id", lessonIds);
      quizIds = (quizzes ?? []).map((q) => q.id as string);
    }

    let avgQuizScorePercent = 0;
    if (quizIds.length) {
      const { data: attempts } = await admin
        .from("student_quiz_attempts")
        .select("score_percent")
        .in("quiz_id", quizIds)
        .eq("status", "submitted");
      if (attempts?.length) {
        avgQuizScorePercent = Math.round(
          attempts.reduce((sum, a) => sum + (a.score_percent as number), 0) / attempts.length,
        );
      }
    }

    let avgCompletionPercent = 0;
    const totalLessonsPossible = lessonIds.length * studentIds.length;
    if (totalLessonsPossible) {
      const { count } = await admin
        .from("lesson_progress")
        .select("id", { count: "exact", head: true })
        .in("lesson_id", lessonIds)
        .in("user_id", studentIds)
        .eq("status", "completed");
      avgCompletionPercent = Math.round(((count ?? 0) / totalLessonsPossible) * 100);
    }

    courses.push({
      course_id: course.id,
      title: course.title,
      status: course.status,
      students_count: studentIds.length,
      avg_completion_percent: avgCompletionPercent,
      avg_quiz_score_percent: avgQuizScorePercent,
    });
  }

  return {
    display_name: teacherProfile?.display_name ?? null,
    rating_avg: teacherProfile?.rating_avg ?? 0,
    rating_count: teacherProfile?.rating_count ?? 0,
    courses,
    total_revenue_cents: totalRevenueCents,
    monthly_revenue: monthlyRevenue,
  };
}
