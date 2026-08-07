"use client";

import { use } from "react";
import Link from "next/link";
import { SubjectCourses } from "@/components/marketing/SubjectCourses";
import { useSubject } from "@/lib/api/queries/subjects";
import { useGrades } from "@/lib/api/queries/grades";
import { useProfile } from "@/lib/api/queries/profile";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

/** Grade isolation, defense-in-depth: /student/subjects already only lists
 * subjects from the student's own grade, but a direct/bookmarked link to
 * another grade's subject id would otherwise still render normally here. */
export default function StudentSubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: grades, isLoading: gradesLoading } = useGrades();
  const { data: subject, isLoading: subjectLoading } = useSubject(id);

  if (profileLoading || gradesLoading || subjectLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Skeleton className="h-9 w-64" />
      </div>
    );
  }

  const myGradeId = grades?.find((g) => g.slug === profile?.grade)?.id;
  const isOtherGrade = !!subject && !!myGradeId && subject.grade_id !== myGradeId;

  if (isOtherGrade) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="text-body text-muted-foreground">المادة دي مش لصفك الدراسي.</p>
        <Button nativeButton={false} render={<Link href="/student/subjects" />}>
          رجوع للمواد بتاعتك
        </Button>
      </div>
    );
  }

  return <SubjectCourses subjectId={id} />;
}
