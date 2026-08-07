"use client";

import Link from "next/link";
import { Lock, PlayCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourseModules, useModuleLessons, type CourseModule } from "@/lib/api/queries/modules";

function ModuleLessons({ moduleId, hasAccess }: { moduleId: string; hasAccess: boolean }) {
  const { data: lessons, isLoading } = useModuleLessons(moduleId);

  if (isLoading) return <Skeleton className="h-16 w-full" />;
  if (!lessons?.length) return <p className="text-small text-muted-foreground">لا يوجد دروس في هذه الوحدة.</p>;

  return (
    <ul className="flex flex-col gap-1">
      {lessons.map((lesson) => {
        const locked = !lesson.is_preview && !hasAccess;
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
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-small font-medium hover:bg-muted"
              >
                <PlayCircle className="size-4 shrink-0 text-primary" />
                {lesson.title}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function CourseModules({ courseId, hasAccess }: { courseId: string; hasAccess: boolean }) {
  const { data: modules, isLoading } = useCourseModules(courseId);

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!modules?.length) {
    return <p className="text-small text-muted-foreground">لا يوجد وحدات في هذا الكورس حالياً.</p>;
  }

  return (
    <Accordion className="w-full">
      {modules.map((mod: CourseModule) => (
        <AccordionItem key={mod.id} value={mod.id}>
          <AccordionTrigger>{mod.title}</AccordionTrigger>
          <AccordionContent>
            <ModuleLessons moduleId={mod.id} hasAccess={hasAccess} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
