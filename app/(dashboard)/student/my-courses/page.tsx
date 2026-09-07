"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  GraduationCap,
  PlayCircle,
  CheckCircle2,
  Clock,
  BookOpen,
  Sparkles,
  Search,
  ArrowUpRight,
  TrendingUp,
  Award,
} from "lucide-react";
import { useDashboard } from "@/lib/api/queries/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type FilterTab = "all" | "in_progress" | "completed" | "not_started";

export default function MyCoursesPage() {
  const { data: dashboard, isLoading, isError } = useDashboard();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const courses = dashboard?.course_progress ?? [];

  const completedCount = courses.filter((c) => c.completion_percent === 100).length;
  const inProgressCount = courses.filter(
    (c) => c.completion_percent > 0 && c.completion_percent < 100,
  ).length;
  const notStartedCount = courses.filter((c) => c.completion_percent === 0).length;
  const totalWatchSeconds = courses.reduce((acc, c) => acc + (c.watch_time_seconds || 0), 0);

  const filteredCourses = courses.filter((c) => {
    // Filter tab
    if (activeFilter === "completed" && c.completion_percent !== 100) return false;
    if (
      activeFilter === "in_progress" &&
      (c.completion_percent === 0 || c.completion_percent === 100)
    )
      return false;
    if (activeFilter === "not_started" && c.completion_percent !== 0) return false;

    // Search query
    if (searchQuery.trim()) {
      return c.course_title.toLowerCase().includes(searchQuery.trim().toLowerCase());
    }
    return true;
  });

  return (
    <div className="flex w-full flex-col gap-8 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card/90 to-primary/5 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="absolute -left-12 -top-12 size-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 size-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary w-fit">
              <Sparkles className="size-3.5" />
              <span>لوحة الكورسات الملكية</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              كورساتي <span className="text-primary">التعليمية</span>
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              جميع المساقات والدورات المشترك بها في مكان واحد، تابع نسب إنجازك وواصل التعلم بدون انقطاع.
            </p>
          </div>

          <Button
            nativeButton={false}
            render={<Link href="/student/subjects" />}
            className="group flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-primary/40 active:scale-95 w-fit"
          >
            <span>استكشف كورسات جديدة</span>
            <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Button>
        </div>

        {/* Quick KPI Stat Chips */}
        <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/50 p-3.5 backdrop-blur-md">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="size-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">{courses.length}</div>
              <div className="text-xs text-muted-foreground">الكورسات المشترك بها</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/50 p-3.5 backdrop-blur-md">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-amber-500">{inProgressCount}</div>
              <div className="text-xs text-muted-foreground">قيد المذاكرة</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/50 p-3.5 backdrop-blur-md">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-emerald-500">{completedCount}</div>
              <div className="text-xs text-muted-foreground">كورسات مكتملة</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/50 p-3.5 backdrop-blur-md">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
              <Clock className="size-5" />
            </div>
            <div>
              <div className="text-base font-bold text-foreground sm:text-lg">
                {formatWatchTime(totalWatchSeconds)}
              </div>
              <div className="text-xs text-muted-foreground">وقت التعلم الكلي</div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && isError && (
        <Card className="border-destructive/20 bg-destructive/5 p-8 text-center">
          <p className="text-destructive font-medium">تعذر تحميل قائمة الكورسات حالياً، يُرجى المحاولة مرة أخرى.</p>
        </Card>
      )}

      {/* Content */}
      {!isLoading && dashboard && (
        <>
          {courses.length === 0 ? (
            /* Empty State when student has no courses */
            <div className="flex flex-col items-center justify-center gap-5 rounded-3xl border border-dashed border-border/80 bg-card/40 p-12 text-center backdrop-blur-sm sm:py-20">
              <div className="relative flex size-24 items-center justify-center rounded-3xl border border-primary/30 bg-primary/10 text-primary shadow-inner">
                <GraduationCap className="size-12" />
                <div className="absolute -inset-1 rounded-3xl bg-primary/20 blur-lg -z-10" />
              </div>
              <div className="flex flex-col gap-2 max-w-md">
                <h3 className="text-xl font-bold text-foreground">لم تشترك في أي كورس بعد!</h3>
                <p className="text-sm text-muted-foreground">
                  ابدأ رحلتك التعليمية الآن، اختر مادتك الدراسية وتصفح أقوى الكورسات المتاحة مع نخبة من أفضل المعلمين.
                </p>
              </div>
              <Button
                nativeButton={false}
                render={<Link href="/student/subjects" />}
                className="mt-2 rounded-xl bg-primary px-6 py-2.5 font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90"
              >
                تصفح المواد والكورسات المتاحة
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Controls bar: Tabs & Search */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border/60 bg-card/60 p-1.5 backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => setActiveFilter("all")}
                    className={cn(
                      "rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 sm:text-sm",
                      activeFilter === "all"
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                    )}
                  >
                    الكل ({courses.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("in_progress")}
                    className={cn(
                      "rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 sm:text-sm",
                      activeFilter === "in_progress"
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                    )}
                  >
                    قيد المذاكرة ({inProgressCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("completed")}
                    className={cn(
                      "rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 sm:text-sm",
                      activeFilter === "completed"
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                    )}
                  >
                    مكتملة ({completedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("not_started")}
                    className={cn(
                      "rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 sm:text-sm",
                      activeFilter === "not_started"
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                    )}
                  >
                    لم تبدأ ({notStartedCount})
                  </button>
                </div>

                {/* Search box */}
                <div className="relative w-full sm:w-72">
                  <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث باسم الكورس..."
                    className="rounded-xl border-border/60 bg-card/60 pr-9 text-sm backdrop-blur-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              {/* Course Cards Grid */}
              {filteredCourses.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
                  <BookOpen className="size-8 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">
                    لا توجد كورسات تطابق هذا البحث أو الفلتر المحدد.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredCourses.map((c) => {
                    const isCompleted = c.completion_percent === 100;
                    const isStarted = c.completion_percent > 0;
                    const courseHref = `/courses/${c.course_id}`;

                    return (
                      <Card
                        key={c.course_id}
                        className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/70 bg-card/70 backdrop-blur-xl shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10"
                      >
                        {/* Course Cover / Top Visual */}
                        <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-slate-900 via-primary/20 to-slate-900">
                          {c.cover_image_url ? (
                            <Image
                              src={c.cover_image_url}
                              alt={c.course_title}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <GraduationCap className="size-16 text-primary/30" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />

                          {/* Status Badge */}
                          <div className="absolute left-3 top-3">
                            {isCompleted ? (
                              <Badge className="flex items-center gap-1 border border-emerald-500/30 bg-emerald-500/90 text-white backdrop-blur-md">
                                <CheckCircle2 className="size-3.5" />
                                <span>مكتمل</span>
                              </Badge>
                            ) : isStarted ? (
                              <Badge className="flex items-center gap-1 border border-amber-500/30 bg-amber-500/90 text-white backdrop-blur-md">
                                <TrendingUp className="size-3.5" />
                                <span>قيد الدراسة ({c.completion_percent}%)</span>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-border/60 bg-background/80 text-muted-foreground backdrop-blur-md">
                                <span>لم يبدأ بعد</span>
                              </Badge>
                            )}
                          </div>

                          {/* Percentage floating badge */}
                          <div className="absolute bottom-3 left-3 rounded-xl border border-border/60 bg-background/80 px-2.5 py-1 text-xs font-bold text-foreground backdrop-blur-md">
                            {c.completion_percent}%
                          </div>
                        </div>

                        {/* Card Body */}
                        <CardContent className="flex flex-1 flex-col justify-between p-5">
                          <div className="flex flex-col gap-3">
                            <h2 className="line-clamp-2 text-lg font-bold text-foreground transition-colors group-hover:text-primary">
                              <Link href={courseHref} className="focus:outline-none">
                                {c.course_title}
                              </Link>
                            </h2>

                            {c.description && (
                              <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                                {c.description}
                              </p>
                            )}
                          </div>

                          {/* Progress bar & details */}
                          <div className="mt-5 flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                                <span className="flex items-center gap-1.5">
                                  <BookOpen className="size-3.5 text-primary" />
                                  <span>
                                    {c.completed_lessons} من {c.total_lessons} درس
                                  </span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Clock className="size-3.5 text-muted-foreground" />
                                  <span>{formatWatchTime(c.watch_time_seconds)}</span>
                                </span>
                              </div>

                              {/* Glowing Progress bar */}
                              <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60 p-0.5">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all duration-700",
                                    isCompleted
                                      ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                                      : "bg-gradient-to-r from-amber-500 to-primary shadow-sm shadow-primary/50",
                                  )}
                                  style={{ width: `${Math.max(c.completion_percent > 0 ? 3 : 0, c.completion_percent)}%` }}
                                />
                              </div>
                            </div>

                            {/* Action Button */}
                            <Button
                              nativeButton={false}
                              render={<Link href={courseHref} />}
                              className={cn(
                                "flex w-full items-center justify-center gap-2 rounded-xl font-bold transition-all duration-300",
                                isCompleted
                                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white"
                                  : isStarted
                                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/40"
                                    : "border border-primary/30 bg-card text-foreground hover:border-primary hover:bg-primary/10",
                              )}
                            >
                              {isCompleted ? (
                                <>
                                  <Award className="size-4" />
                                  <span>مراجعة الكورس والمحتوى</span>
                                </>
                              ) : isStarted ? (
                                <>
                                  <PlayCircle className="size-4" />
                                  <span>استئناف التعلم ▶</span>
                                </>
                              ) : (
                                <>
                                  <PlayCircle className="size-4" />
                                  <span>بدء المذاكرة الآن ▶</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
