"use client";

import Link from "next/link";
import { ArrowRight, ArrowLeft, Lock, PlayCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourseModules, useModuleLessons } from "@/lib/api/queries/modules";
import { useCourseProgress } from "@/lib/api/queries/lesson-progress";
import { CourseExams } from "@/components/marketing/CourseExams";
import { cn } from "@/lib/utils";

function ModuleProgressList({
  moduleId,
  currentLessonId,
  hasAccess,
  completedLessonIds,
}: {
  moduleId: string;
  currentLessonId: string;
  hasAccess: boolean;
  completedLessonIds: Set<string>;
}) {
  const { data: lessons, isLoading } = useModuleLessons(moduleId);

  if (isLoading) return <Skeleton className="h-16 w-full rounded-lg" />;
  if (!lessons?.length) return null;

  return (
    <ul className="flex flex-col gap-1">
      {lessons.map((lesson) => {
        const locked = !lesson.is_preview && !hasAccess;
        const active = lesson.id === currentLessonId;
        const completed = completedLessonIds.has(lesson.id);
        return (
          <li key={lesson.id}>
            {locked ? (
              <span className="flex items-center gap-2 rounded-lg px-3 py-2 text-small text-muted-foreground">
                <Lock className="size-4 shrink-0" />
                {lesson.title}
              </span>
            ) : (
              <Link
                href={`/lessons/${lesson.id}`}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-small font-medium",
                  active ? "bg-primary text-secondary" : "hover:bg-muted",
                )}
              >
                {completed ? (
                  <CheckCircle2 className={cn("size-4 shrink-0", !active && "text-primary")} />
                ) : (
                  <PlayCircle className="size-4 shrink-0" />
                )}
                {lesson.title}
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
  const { data: lessons, isLoading } = useModuleLessons(moduleId);
  const { data: modules, isLoading: modulesLoading } = useCourseModules(courseId);
  const { data: courseProgress } = useCourseProgress(courseId);
  const completedLessonIds = new Set(courseProgress?.completed_lesson_ids ?? []);

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const currentIndex = lessons?.findIndex((l) => l.id === currentLessonId) ?? -1;
  const prev = currentIndex > 0 ? lessons?.[currentIndex - 1] : null;
  const next =
    currentIndex >= 0 && lessons && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex w-full flex-col gap-4">
        <Button variant="outline" className="w-full" nativeButton={false} render={<Link href={`/courses/${courseId}`} />}>
          الرجوع للكورس
        </Button>

        <div className="flex w-full gap-2">
          {prev && (
            <Button
              variant="outline"
              className="flex-1"
              nativeButton={false}
              render={<Link href={`/lessons/${prev.id}`} />}
            >
              <ArrowRight />
              السابق
            </Button>
          )}
          {next && (
            <Button className="flex-1" nativeButton={false} render={<Link href={`/lessons/${next.id}`} />}>
              التالي
              <ArrowLeft />
            </Button>
          )}
        </div>
      </div>

      <div className="flex w-full flex-col gap-3">
        <h3 className="text-small font-semibold text-secondary dark:text-white">تقدمك في الكورس</h3>
        {modulesLoading ? (
          <div className="flex w-full flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="flex w-full flex-col gap-3">
            {modules?.map((mod) => (
              <div key={mod.id} className="flex flex-col gap-1">
                <p className="px-3 text-xs font-semibold text-muted-foreground">{mod.title}</p>
                <ModuleProgressList
                  moduleId={mod.id}
                  currentLessonId={currentLessonId}
                  hasAccess={hasAccess}
                  completedLessonIds={completedLessonIds}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {hasAccess && (
        <div className="flex w-full flex-col gap-3">
          <h3 className="text-small font-semibold text-secondary dark:text-white">الاختبارات</h3>
          <CourseExams courseId={courseId} />
        </div>
      )}
    </div>
  );
}
