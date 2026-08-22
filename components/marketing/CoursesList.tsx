"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useGrades } from "@/lib/api/queries/grades";
import { useSubjects } from "@/lib/api/queries/subjects";
import { useCourses } from "@/lib/api/queries/courses";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseCard } from "./CourseCard";

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-1.5 text-small font-medium transition-colors",
        active
          ? "border-primary bg-primary text-secondary"
          : "border-input text-foreground/80 hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

export function CoursesList() {
  const [gradeId, setGradeId] = useState<string | undefined>(undefined);
  const [subjectId, setSubjectId] = useState<string | undefined>(undefined);
  const { data: grades, isLoading: gradesLoading } = useGrades();
  // Subjects are grade-specific rows (a subject belongs to exactly one
  // grade), so once a grade is picked the subject buttons narrow to match -
  // an unrelated combination would otherwise just silently return nothing.
  const { data: subjects, isLoading: subjectsLoading } = useSubjects(gradeId);
  const { data: courses, isLoading: coursesLoading, isError } = useCourses({ gradeId, subjectId });

  const onSelectGrade = (id: string | undefined) => {
    setGradeId(id);
    setSubjectId(undefined);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-h2 text-secondary dark:text-white">كل الكورسات</h1>

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <span className="text-caption font-medium text-muted-foreground">الصف الدراسي</span>
          <div className="flex flex-wrap gap-2">
            <FilterButton active={!gradeId} onClick={() => onSelectGrade(undefined)}>
              الكل
            </FilterButton>
            {gradesLoading && <Skeleton className="h-8 w-24 rounded-full" />}
            {grades?.map((grade) => (
              <FilterButton key={grade.id} active={gradeId === grade.id} onClick={() => onSelectGrade(grade.id)}>
                {grade.name}
              </FilterButton>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-caption font-medium text-muted-foreground">المادة</span>
          <div className="flex flex-wrap gap-2">
            <FilterButton active={!subjectId} onClick={() => setSubjectId(undefined)}>
              الكل
            </FilterButton>
            {subjectsLoading && <Skeleton className="h-8 w-24 rounded-full" />}
            {subjects?.map((subject) => (
              <FilterButton key={subject.id} active={subjectId === subject.id} onClick={() => setSubjectId(subject.id)}>
                {subject.name}
              </FilterButton>
            ))}
          </div>
        </div>
      </div>

      {coursesLoading && (
        <div className="mt-8 grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!coursesLoading && isError && (
        <p className="mt-8 text-small text-muted-foreground">تعذر تحميل الكورسات حالياً.</p>
      )}

      {!coursesLoading && !isError && courses?.length === 0 && (
        <p className="mt-8 text-small text-muted-foreground">لا يوجد كورسات مطابقة لهذا الفلتر.</p>
      )}

      {!coursesLoading && !isError && !!courses?.length && (
        <div className="mt-8 grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
