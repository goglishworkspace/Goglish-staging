"use client";

import { useState } from "react";
import Link from "next/link";
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
  RotateCcw,
} from "lucide-react";
import { useMyCourses } from "@/lib/api/queries/courses";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CourseCoverImage } from "@/components/shared/CourseCoverImage";
import { cn } from "@/lib/utils";

function formatWatchTime(seconds: number): string {
  if (!seconds || seconds <= 0) return "0 د";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} س ${minutes > 0 ? `و ${minutes} د` : ""}`;
  }
  return `${Math.max(1, minutes)} دقيقة`;
}

type FilterTab = "all" | "in_progress" | "completed" | "not_started";

export function MyCoursesView() {
  const { data: courses = [], isLoading, isError } = useMyCourses();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

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
    <div className="flex w-full flex-col gap-8 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-card via-card/95 to-primary/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-16 size-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-16 size-64 rounded-full bg-amber-500/15 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary w-fit">
              <Sparkles className="size-3.5" />
              <span>لوحة الكورسات الملكية</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              كورساتي <span className="text-primary">التعليمية</span>
            </h1>
            <p className="max-w-xl text-xs text-muted-foreground sm:text-sm leading-relaxed">
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
          <div className="flex items-center gap-3.5 rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur-md transition-all hover:border-primary/40">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
              <BookOpen className="size-5" />
            </div>
            <div>
              <div className="text-xl font-black text-foreground">{courses.length}</div>
              <div className="text-xs text-muted-foreground">الكورسات المشترك بها</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur-md transition-all hover:border-amber-500/40">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 shadow-inner">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <div className="text-xl font-black text-amber-500">{inProgressCount}</div>
              <div className="text-xs text-muted-foreground">قيد المذاكرة</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur-md transition-all hover:border-emerald-500/40">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 shadow-inner">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <div className="text-xl font-black text-emerald-500">{completedCount}</div>
              <div className="text-xs text-muted-foreground">كورسات مكتملة</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur-md transition-all hover:border-purple-500/40">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 shadow-inner">
              <Clock className="size-5" />
            </div>
            <div>
              <div className="text-base font-black text-foreground sm:text-lg">
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
            <Skeleton key={i} className="h-80 w-full rounded-3xl" />
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
      {!isLoading && !isError && (
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
                        className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/70 bg-card/75 backdrop-blur-xl shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/15"
                      >
                        {/* Course Cover / Top Visual with Fallback Protection */}
                        <div className="relative w-full overflow-hidden">
                          <CourseCoverImage
                            src={c.cover_image_url}
                            alt={c.course_title}
                          />

                          {/* Status Badge at Top Right */}
                          <div className="absolute right-3 top-3 z-10">
                            {isCompleted ? (
                              <Badge className="flex items-center gap-1.5 border border-emerald-500/40 bg-emerald-500/90 text-white shadow-md shadow-emerald-500/20 backdrop-blur-md text-xs font-semibold px-2.5 py-1">
                                <CheckCircle2 className="size-3.5" />
                                <span>مكتمل 100%</span>
                              </Badge>
                            ) : isStarted ? (
                              <Badge className="flex items-center gap-1.5 border border-amber-500/40 bg-amber-500/90 text-white shadow-md shadow-amber-500/20 backdrop-blur-md text-xs font-semibold px-2.5 py-1">
                                <TrendingUp className="size-3.5" />
                                <span>قيد الدراسة ({c.completion_percent}%)</span>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-border/80 bg-background/85 text-muted-foreground backdrop-blur-md text-xs font-semibold px-2.5 py-1">
                                <span>لم يبدأ بعد</span>
                              </Badge>
                            )}
                          </div>

                          {/* Floating Progress Chip at Bottom Left */}
                          <div className="absolute bottom-3 left-3 z-10 rounded-xl border border-white/10 bg-black/60 px-2.5 py-1 text-xs font-black text-white shadow-lg backdrop-blur-md">
                            {c.completion_percent}% إنجاز
                          </div>
                        </div>

                        {/* Card Body */}
                        <CardContent className="flex flex-1 flex-col justify-between p-5">
                          <div className="flex flex-col gap-2.5">
                            <h2 className="line-clamp-2 text-lg font-bold text-foreground transition-colors group-hover:text-primary leading-snug">
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
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                                <span className="flex items-center gap-1.5">
                                  <BookOpen className="size-3.5 text-primary" />
                                  <span className="font-semibold text-foreground">
                                    {c.completed_lessons} من {c.total_lessons}
                                  </span>{" "}
                                  درس مكتمل
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Clock className="size-3.5 text-muted-foreground" />
                                  <span>{formatWatchTime(c.watch_time_seconds)}</span>
                                </span>
                              </div>

                              {/* Glowing Progress bar with defined track */}
                              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/60 border border-border/40 p-0.5">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all duration-700",
                                    isCompleted
                                      ? "bg-emerald-500 shadow-sm shadow-emerald-500/60"
                                      : isStarted
                                        ? "bg-gradient-to-r from-amber-500 to-primary shadow-sm shadow-primary/60"
                                        : "bg-transparent",
                                  )}
                                  style={{
                                    width: isCompleted
                                      ? "100%"
                                      : isStarted
                                        ? `${Math.max(5, c.completion_percent)}%`
                                        : "0%",
                                  }}
                                />
                              </div>
                            </div>

                            {/* Action Button */}
                            <Button
                              nativeButton={false}
                              render={<Link href={courseHref} />}
                              className={cn(
                                "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-bold transition-all duration-300 shadow-md",
                                isCompleted
                                  ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white"
                                  : isStarted
                                    ? "bg-primary text-primary-foreground shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/40 active:scale-[0.98]"
                                    : "border border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground hover:shadow-primary/30 active:scale-[0.98]",
                              )}
                            >
                              {isCompleted ? (
                                <>
                                  <RotateCcw className="size-4" />
                                  <span>مراجعة محتوى الكورس</span>
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
