"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Trophy,
  Flame,
  Award,
  GraduationCap,
  Clock,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Zap,
  BookOpen,
  ArrowLeft,
} from "lucide-react";
import { useDashboard } from "@/lib/api/queries/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatWatchTime(seconds: number): string {
  if (!seconds || seconds <= 0) return "0 د";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} ساعة ${minutes > 0 ? `و ${minutes} د` : ""}`;
  }
  return `${Math.max(1, minutes)} دقيقة`;
}

function computeLast8Weeks(weeklyData: Array<{ week: string; xp: number }>) {
  const result: Array<{ key: string; label: string; xp: number; isCurrent: boolean }> = [];
  const now = new Date();

  // Create lookup map from server weekly progress
  const serverMap = new Map<string, number>();
  for (const item of weeklyData) {
    serverMap.set(item.week, item.xp);
    // Also store just the week number part (e.g. "36" from "2026-W36") as fallback
    const part = item.week.split("-W")[1];
    if (part) serverMap.set(part, item.xp);
  }

  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    const dayMs = 86400000;
    const weekNum = Math.ceil(((d.getTime() - jan4.getTime()) / dayMs + jan4.getUTCDay() + 1) / 7);
    const fullKey = `${d.getUTCFullYear()}-W${weekNum}`;
    const isCurrent = i === 0;

    // Check if server returned xp for fullKey or weekNum
    const xp = serverMap.get(fullKey) ?? serverMap.get(String(weekNum)) ?? 0;

    result.push({
      key: fullKey,
      label: isCurrent ? "هذا الأسبوع" : `أسبوع ${weekNum}`,
      xp,
      isCurrent,
    });
  }

  // Edge case: if server had weekly data with keys that didn't match the calculated weeks,
  // ensure any active server item is represented
  for (const item of weeklyData) {
    const exists = result.some((r) => r.key === item.week || r.label.includes(item.week.split("-W")[1] ?? ""));
    if (!exists && result.length > 0) {
      // Replace the last non-current matching or merge
      result[result.length - 1].xp += item.xp;
    }
  }

  return result;
}

export default function ProgressPage() {
  const { data: dashboard, isLoading, isError } = useDashboard();

  const courses = dashboard?.course_progress ?? [];
  const totalCourses = courses.length;
  const completedCourses = courses.filter((c) => c.completion_percent === 100).length;
  const inProgressCourses = courses.filter(
    (c) => c.completion_percent > 0 && c.completion_percent < 100,
  ).length;
  const avgCompletion = totalCourses
    ? Math.round(courses.reduce((sum, c) => sum + c.completion_percent, 0) / totalCourses)
    : 0;
  const totalWatchSeconds = courses.reduce((sum, c) => sum + (c.watch_time_seconds || 0), 0);

  const weeklyWeeks = useMemo(() => {
    return computeLast8Weeks(dashboard?.weekly_progress ?? []);
  }, [dashboard?.weekly_progress]);

  const totalWeeklyXp = weeklyWeeks.reduce((acc, w) => acc + w.xp, 0);
  const maxXp = Math.max(50, ...weeklyWeeks.map((w) => w.xp));

  const rankData = dashboard?.current_rank as { rank: number; xp: number } | null;
  const levelData = dashboard?.level;

  return (
    <div className="flex w-full flex-col gap-8 pb-12">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card/90 to-primary/5 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="absolute -left-12 -top-12 size-60 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 size-60 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary w-fit">
              <Sparkles className="size-3.5" />
              <span>لوحة متابعة الإنجاز والنشاط الأكاديمي</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              سجل <span className="text-primary">التقدم الملكي</span>
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              تتبع نشاطك الأسبوعي، مستويات الخبرة (XP)، أيام الحماس المتتالية، ومعدلات إنجازك لكل كورس.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              nativeButton={false}
              render={<Link href="/student/my-courses" />}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90"
            >
              <GraduationCap className="size-4" />
              <span>كورساتي</span>
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/student/honor-board" />}
              variant="outline"
              className="flex items-center gap-2 rounded-xl border-primary/30 bg-card/60 px-5 py-2.5 font-bold backdrop-blur-md hover:border-primary hover:bg-primary/10"
            >
              <Trophy className="size-4 text-amber-500" />
              <span>لوحة الشرف</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-3xl" />
          <Skeleton className="h-80 w-full rounded-3xl" />
        </div>
      )}

      {/* Error state */}
      {!isLoading && isError && (
        <Card className="border-destructive/20 bg-destructive/5 p-8 text-center">
          <p className="text-destructive font-medium">تعذر تحميل بيانات التقدم حالياً، يُرجى إعادة المحاولة لاحقاً.</p>
        </Card>
      )}

      {/* Dashboard Data */}
      {!isLoading && dashboard && (
        <>
          {/* Top 4 Royal KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* KPI 1: Level & XP */}
            <Card className="group relative overflow-hidden rounded-3xl border border-primary/25 bg-card/75 p-5 backdrop-blur-xl shadow-lg transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10">
              <div className="absolute -right-6 -top-6 size-24 rounded-full bg-primary/10 blur-xl group-hover:bg-primary/20 transition-colors" />
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-muted-foreground">المستوى والخبرة</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-foreground">
                      {dashboard.total_xp.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-primary">XP</span>
                  </div>
                  <span className="mt-1 text-xs font-medium text-amber-500 flex items-center gap-1">
                    <Zap className="size-3" />
                    المستوى {levelData?.level_number ?? 1}: {levelData?.title ?? "مبتدئ"}
                  </span>
                </div>
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-inner">
                  <Trophy className="size-6" />
                </div>
              </div>
            </Card>

            {/* KPI 2: Active Streak */}
            <Card className="group relative overflow-hidden rounded-3xl border border-amber-500/25 bg-card/75 p-5 backdrop-blur-xl shadow-lg transition-all duration-300 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/10">
              <div className="absolute -right-6 -top-6 size-24 rounded-full bg-amber-500/10 blur-xl group-hover:bg-amber-500/20 transition-colors" />
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-muted-foreground">سلسلة الحماس اليومية</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-amber-500">
                      {dashboard.current_streak_days}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground">أيام متتالية</span>
                  </div>
                  <span className="mt-1 text-xs text-muted-foreground">
                    أطول سلسلة: {dashboard.longest_streak_days} يوم
                  </span>
                </div>
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-500 shadow-inner">
                  <Flame className="size-6" />
                </div>
              </div>
            </Card>

            {/* KPI 3: Leaderboard Rank */}
            <Card className="group relative overflow-hidden rounded-3xl border border-purple-500/25 bg-card/75 p-5 backdrop-blur-xl shadow-lg transition-all duration-300 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10">
              <div className="absolute -right-6 -top-6 size-24 rounded-full bg-purple-500/10 blur-xl group-hover:bg-purple-500/20 transition-colors" />
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-muted-foreground">ترتيب لوحة الشرف</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-purple-400">
                      {rankData ? `#${rankData.rank}` : "—"}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground">على المنصة</span>
                  </div>
                  <Link
                    href="/student/honor-board"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-purple-400 hover:underline"
                  >
                    <span>عرض الأوائل</span>
                    <ArrowLeft className="size-3" />
                  </Link>
                </div>
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10 text-purple-400 shadow-inner">
                  <Award className="size-6" />
                </div>
              </div>
            </Card>

            {/* KPI 4: Enrolled & Completed Courses */}
            <Card className="group relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-card/75 p-5 backdrop-blur-xl shadow-lg transition-all duration-300 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10">
              <div className="absolute -right-6 -top-6 size-24 rounded-full bg-emerald-500/10 blur-xl group-hover:bg-emerald-500/20 transition-colors" />
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-muted-foreground">إنجاز الكورسات</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-emerald-500">
                      {completedCourses}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground">من {totalCourses} مكتمل ({avgCompletion}%)</span>
                  </div>
                  <span className="mt-1 text-xs text-muted-foreground">
                    قيد المذاكرة: {inProgressCourses} • تعلّم: {formatWatchTime(totalWatchSeconds)}
                  </span>
                </div>
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 shadow-inner">
                  <CheckCircle2 className="size-6" />
                </div>
              </div>
            </Card>
          </div>

          {/* Weekly Progress Royal Chart */}
          <Card className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/80 p-6 shadow-xl backdrop-blur-xl sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BarChart3 className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground sm:text-xl">
                    مخطط النشاط الأسبوعي (XP)
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    تطور نقاط الخبرة التي جمعتها خلال آخر 8 أسابيع
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="rounded-xl border border-border/60 bg-background/60 px-3.5 py-1.5 text-xs backdrop-blur-md">
                  <span className="text-muted-foreground">إجمالي نشاط الفترة: </span>
                  <span className="font-bold text-primary">{totalWeeklyXp.toLocaleString()} XP</span>
                </div>
              </div>
            </div>

            <CardContent className="p-0 pt-8">
              {/* Luxury Chart Bars */}
              <div className="grid grid-cols-8 gap-2 sm:gap-4 h-60 items-end w-full px-1">
                {weeklyWeeks.map((w) => {
                  const barPercent = maxXp > 0 && w.xp > 0 ? Math.max(8, (w.xp / maxXp) * 100) : 4;
                  return (
                    <div
                      key={w.key}
                      className="group flex flex-col items-center justify-end h-full gap-2 relative"
                    >
                      {/* Tooltip on hover / active */}
                      <div className="absolute -top-9 z-20 hidden group-hover:flex flex-col items-center pointer-events-none transition-all duration-200">
                        <div className="rounded-lg border border-primary/40 bg-popover px-2 py-1 text-[11px] font-bold text-popover-foreground shadow-xl">
                          {w.xp} XP
                        </div>
                        <div className="size-1.5 rotate-45 bg-popover border-b border-r border-primary/40 -mt-1" />
                      </div>

                      {/* XP Label above bar if > 0 */}
                      {w.xp > 0 && (
                        <span className="text-[10px] font-bold text-primary group-hover:opacity-0 transition-opacity">
                          {w.xp}
                        </span>
                      )}

                      {/* Bar Track Container */}
                      <div className="relative w-full max-w-[42px] h-44 rounded-2xl bg-muted/40 p-1 flex items-end justify-center border border-border/40 group-hover:border-primary/40 transition-colors">
                        <div
                          className={cn(
                            "w-full rounded-xl transition-all duration-500",
                            w.xp > 0
                              ? w.isCurrent
                                ? "bg-gradient-to-t from-primary via-amber-500 to-amber-300 shadow-md shadow-amber-500/30 ring-1 ring-amber-400"
                                : "bg-gradient-to-t from-primary/70 via-primary to-amber-400 shadow-sm shadow-primary/20"
                              : "bg-muted/60 h-2",
                          )}
                          style={{ height: w.xp > 0 ? `${barPercent}%` : "6px" }}
                        />
                      </div>

                      {/* Week Label */}
                      <div className="flex flex-col items-center text-center">
                        <span
                          className={cn(
                            "text-[10px] sm:text-xs font-semibold whitespace-nowrap",
                            w.isCurrent ? "text-primary font-bold" : "text-muted-foreground",
                          )}
                        >
                          {w.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalWeeklyXp === 0 && (
                <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 text-center text-xs text-muted-foreground">
                  <Sparkles className="size-4 text-primary" />
                  <span>
                    سجّل حضورك وذاكر هذا الأسبوع لتبدأ جمع نقاط الـ XP والارتقاء في لوحة الشرف!
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Courses Progress Detailed Section */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  تقدم الكورسات والدورات
                </h2>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  مستوى الإنجاز في كل مساق تعليمي مشترك به حالياً
                </p>
              </div>

              <Button
                nativeButton={false}
                render={<Link href="/student/my-courses" />}
                variant="outline"
                className="flex items-center gap-2 rounded-xl border-border/70 bg-card/60 px-4 py-2 text-xs font-bold backdrop-blur-md hover:border-primary hover:bg-primary/10 w-fit"
              >
                <span>عرض الكل في كورساتي</span>
                <ArrowUpRight className="size-3.5" />
              </Button>
            </div>

            {courses.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/80 bg-card/40 p-12 text-center backdrop-blur-sm">
                <BookOpen className="size-10 text-muted-foreground" />
                <div className="flex flex-col gap-1 max-w-sm">
                  <h3 className="text-base font-bold text-foreground">مش مشترك في أي كورس لسه</h3>
                  <p className="text-xs text-muted-foreground">
                    تصفح المواد الدراسية وابدأ الآن مع أقوى نخبة من المعلمين.
                  </p>
                </div>
                <Button
                  nativeButton={false}
                  render={<Link href="/student/subjects" />}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-md shadow-primary/25"
                >
                  استعراض المواد
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {courses.map((c) => {
                  const isCompleted = c.completion_percent === 100;
                  const isStarted = c.completion_percent > 0;
                  const courseHref = `/courses/${c.course_id}`;

                  return (
                    <Card
                      key={c.course_id}
                      className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card/75 p-6 backdrop-blur-xl shadow-lg transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10"
                    >
                      <div className="flex flex-col justify-between h-full gap-5">
                        {/* Course header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-col gap-1">
                            <h3 className="line-clamp-1 text-base font-bold text-foreground transition-colors group-hover:text-primary">
                              <Link href={courseHref} className="focus:outline-none">
                                {c.course_title}
                              </Link>
                            </h3>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                              <span className="flex items-center gap-1">
                                <BookOpen className="size-3.5 text-primary" />
                                {c.completed_lessons} / {c.total_lessons} دروس
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="size-3.5" />
                                {formatWatchTime(c.watch_time_seconds)}
                              </span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          {isCompleted ? (
                            <Badge className="flex items-center gap-1 border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
                              <CheckCircle2 className="size-3" />
                              <span>مكتمل</span>
                            </Badge>
                          ) : isStarted ? (
                            <Badge className="flex items-center gap-1 border border-amber-500/30 bg-amber-500/10 text-amber-500">
                              <TrendingUp className="size-3" />
                              <span>{c.completion_percent}%</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-border/60 text-muted-foreground">
                              لم يبدأ
                            </Badge>
                          )}
                        </div>

                        {/* Progress bar */}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-muted-foreground">نسبة الإنجاز</span>
                            <span className={cn(isCompleted ? "text-emerald-500" : "text-primary")}>
                              {c.completion_percent}%
                            </span>
                          </div>

                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60 p-0.5">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-700",
                                isCompleted
                                  ? "bg-emerald-500 shadow-sm shadow-emerald-500/40"
                                  : "bg-gradient-to-r from-amber-500 to-primary shadow-sm shadow-primary/40",
                              )}
                              style={{ width: `${Math.max(c.completion_percent > 0 ? 3 : 0, c.completion_percent)}%` }}
                            />
                          </div>
                        </div>

                        {/* Action CTA */}
                        <div className="flex items-center justify-end pt-1">
                          <Button
                            nativeButton={false}
                            render={<Link href={courseHref} />}
                            className={cn(
                              "flex items-center gap-2 rounded-xl text-xs font-bold transition-all",
                              isCompleted
                                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white"
                                : "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90",
                            )}
                          >
                            <span>{isCompleted ? "مراجعة الكورس" : "استئناف التعلم ▶"}</span>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
