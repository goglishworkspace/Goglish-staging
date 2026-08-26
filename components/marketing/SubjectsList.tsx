"use client";

import Link from "next/link";
import { useGrades } from "@/lib/api/queries/grades";
import { useSubjects } from "@/lib/api/queries/subjects";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

/** Shared between the public catalog (app/(marketing)/subjects) and the
 * logged-in student dashboard's own subjects browsing
 * (app/(dashboard)/student/subjects) - identical data/markup, only the link
 * target differs (public vs dashboard-scoped), so that's the one prop.
 *
 * `gradeId` narrows the grade sections shown to exactly one grade - passed
 * by the student dashboard (their own grade only), omitted on the public
 * catalog (browse every grade). */
export function SubjectsList({
  subjectHrefBase,
  gradeId,
}: {
  subjectHrefBase: string;
  gradeId?: string;
}) {
  const { data: grades, isLoading: gradesLoading } = useGrades();
  const { data: subjects, isLoading: subjectsLoading } = useSubjects();
  const isLoading = gradesLoading || subjectsLoading;
  const visibleGrades = gradeId ? grades?.filter((g) => g.id === gradeId) : grades;
  const hasAnyVisibleSubject = visibleGrades?.some((grade) => subjects?.some((s) => s.grade_id === grade.id));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-h2 text-secondary dark:text-white">المواد الدراسية</h1>

      {isLoading && (
        <div className="mt-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading &&
        visibleGrades?.map((grade) => {
          const gradeSubjects = subjects?.filter((s) => s.grade_id === grade.id) ?? [];
          if (!gradeSubjects.length) return null;
          return (
            <section key={grade.id} className="mt-10 w-full">
              <h2 className="text-h3 text-secondary dark:text-white">{grade.name}</h2>
              <div className="mt-4 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {gradeSubjects.map((subject) => (
                  <Link key={subject.id} href={`${subjectHrefBase}/${subject.id}`}>
                    <Card className="w-full transition-shadow hover:shadow-md">
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-foreground">{subject.name}</h3>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

      {!isLoading && !hasAnyVisibleSubject && (
        <p className="mt-8 text-small text-muted-foreground">لا يوجد مواد دراسية متاحة حالياً.</p>
      )}
    </div>
  );
}
