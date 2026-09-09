"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  Lock,
  PlayCircle,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourseModules, type Lesson } from "@/lib/api/queries/modules";
import { useCourseProgress } from "@/lib/api/queries/lesson-progress";
import { CourseExams } from "@/components/marketing/CourseExams";
import { cn } from "@/lib/utils";

function ModuleProgressList({
  lessons,
  currentLessonId,
  hasAccess,
  completedLessonIds,
}: {
  lessons: Lesson[];
  currentLessonId: string;
  hasAccess: boolean;
  completedLessonIds: Set<string>;
}) {
  if (!lessons.length) return null;

  return (
    <ul className="flex flex-col gap-1.5">
      {lessons.map((lesson, idx) => {
        const locked = !lesson.is_preview && !hasAccess;
        const active = lesson.id === currentLessonId;
        const completed = completedLessonIds.has(lesson.id);

        return (
          <li key={lesson.id}>
            {locked ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-transparent px-3 py-2.5 text-xs text-muted-foreground bg-muted/20 select-none">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted/60 text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span className="truncate">{lesson.title}</span>
                </div>
                <Lock className="size-3.5 shrink-0 text-muted-foreground/70" />
              </div>
            ) : (
              <Link
                href={`/lessons/${lesson.id}`}
                className={cn(
                  "group flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all",
                  active
                    ? "border border-primary/50 bg-primary text-primary-foreground shadow-md shadow-primary/25 font-bold"
                    : "border border-transparent hover:border-border hover:bg-card/90 text-foreground/80 hover:text-foreground",
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
                      active ? "bg-black/20 text-white" : "bg-muted/60 text-muted-foreground",
                    )}
                  >
                    {idx + 1}
                  </span>
                  <span className="truncate">{lesson.title}</span>
                </div>

                {completed ? (
                  <CheckCircle2
                    className={cn(
                      "size-4 shrink-0",
                      active ? "text-white" : "text-emerald-500",
                    )}
                  />
                ) : (
                  <PlayCircle
                    className={cn(
                      "size-4 shrink-0 opacity-70 group-hover:opacity-100",
                      active ? "text-white" : "text-primary",
                    )}
                  />
                )}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function CourseNavSidebar({
  moduleId,
  courseId,
  currentLessonId,
  hasAccess,
}: {
  moduleId: string;
  courseId: string;
  currentLessonId: string;
  hasAccess: boolean;
}) {
  const { data: modules, isLoading: modulesLoading } = useCourseModules(courseId);
  const { data: courseProgress } = useCourseProgress(courseId);
  const completedLessonIds = new Set(courseProgress?.completed_lesson_ids ?? []);

  if (modulesLoading) {
    return (
      <div className="flex w-full flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  const currentModule = modules?.find((m) => m.id === moduleId);
  const lessons = currentModule?.lessons ?? [];
  const currentIndex = lessons.findIndex((l) => l.id === currentLessonId);
  const prev = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const next =
    currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  return (
    <div className="flex w-full flex-col gap-5 rounded-3xl border border-border/70 bg-card/75 p-5 backdrop-blur-xl shadow-xl">
      {/* Top Action Nav Controls */}
      <div className="flex flex-col gap-2.5">
        <Button
          variant="outline"
          className="flex w-full items-center justify-center gap-2 rounded-xl border-border/70 bg-background/60 font-bold text-xs hover:border-primary hover:bg-primary/10 transition-all"
          nativeButton={false}
          render={<Link href={`/courses/${courseId}`} />}
        >
          <GraduationCap className="size-4 text-primary" />
          <span>الرجوع لصفحة الكورس</span>
        </Button>

        {/* Prev / Next Lesson CTA */}
        <div className="flex w-full gap-2">
          {prev ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border-border/70 text-xs font-semibold hover:border-primary"
              nativeButton={false}
              render={<Link href={`/lessons/${prev.id}`} />}
            >
              <ArrowRight className="size-3.5" />
              <span>الدرس السابق</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="flex-1 text-xs font-medium rounded-xl opacity-40"
            >
              <span>بداية الوحدة</span>
            </Button>
          )}

          {next ? (
            <Button
              size="sm"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:bg-primary/90"
              nativeButton={false}
              render={<Link href={`/lessons/${next.id}`} />}
            >
              <span>الدرس التالي</span>
              <ArrowLeft className="size-3.5" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="flex-1 text-xs font-medium rounded-xl opacity-40"
            >
              <span>نهاية الوحدة</span>
            </Button>
          )}
        </div>
      </div>

      {/* Course Curriculum Modules & Lessons */}
      <div className="flex w-full flex-col gap-3 pt-1">
        <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground">فهرس دروس الكورس</h3>
          </div>
          {courseProgress?.percent !== undefined && (
            <span className="text-[11px] font-bold text-primary">
              {courseProgress.percent}% مكتمل
            </span>
          )}
        </div>

        {modulesLoading ? (
          <div className="flex w-full flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="flex w-full flex-col gap-4 max-h-[420px] overflow-y-auto pe-1">
            {modules?.map((mod, modIndex) => (
              <div key={mod.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 px-1">
                  <span className="flex size-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                    {modIndex + 1}
                  </span>
                  <p className="text-xs font-bold text-foreground truncate">{mod.title}</p>
                </div>
                <ModuleProgressList
                  lessons={mod.lessons ?? []}
                  currentLessonId={currentLessonId}
                  hasAccess={hasAccess}
                  completedLessonIds={completedLessonIds}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exams Section */}
      {hasAccess && (
        <div className="flex w-full flex-col gap-2.5 border-t border-border/50 pt-3">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber-500" />
            <span>امتحانات الكورس</span>
          </h3>
          <CourseExams courseId={courseId} />
        </div>
      )}
    </div>
  );
}
