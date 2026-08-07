"use client";

import { useSubject } from "@/lib/api/queries/subjects";
import { useCoursesBySubject } from "@/lib/api/queries/courses";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseCard } from "@/components/marketing/CourseCard";

/** Shared between the public catalog (app/(marketing)/subjects/[id]) and the
 * logged-in student dashboard's own subjects browsing
 * (app/(dashboard)/student/subjects/[id]) - see SubjectsList.tsx for why. */
export function SubjectCourses({ subjectId }: { subjectId: string }) {
  const { data: subject, isLoading: subjectLoading, isError } = useSubject(subjectId);
  const { data: courses, isLoading: coursesLoading } = useCoursesBySubject(subjectId);

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-small text-muted-foreground">تعذر تحميل المادة.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {subjectLoading ? (
        <Skeleton className="h-9 w-64" />
      ) : (
        <h1 className="text-h2 text-secondary dark:text-white">{subject?.name}</h1>
      )}

      <h2 className="mt-8 text-h3 text-secondary dark:text-white">الكورسات</h2>
      <div className="mt-4 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {coursesLoading &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-xl" />)}
        {!coursesLoading && courses?.map((course) => <CourseCard key={course.id} course={course} />)}
      </div>

      {!coursesLoading && !courses?.length && (
        <p className="mt-4 text-small text-muted-foreground">لا يوجد كورسات في هذه المادة حالياً.</p>
      )}
    </div>
  );
}
