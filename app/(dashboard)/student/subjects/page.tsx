"use client";

import Link from "next/link";
import { SubjectsList } from "@/components/marketing/SubjectsList";
import { useGrades } from "@/lib/api/queries/grades";
import { useProfile } from "@/lib/api/queries/profile";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function StudentSubjectsPage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: grades, isLoading: gradesLoading } = useGrades();

  if (profileLoading || gradesLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Skeleton className="h-9 w-64" />
      </div>
    );
  }

  if (!profile?.grade) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="text-body text-muted-foreground">لازم تختار صفك الدراسي الأول عشان تشوف المواد بتاعتك.</p>
        <Button nativeButton={false} render={<Link href="/student/choose-grade" />}>
          اختار صفك الدراسي
        </Button>
      </div>
    );
  }

  const gradeId = grades?.find((g) => g.slug === profile.grade)?.id;

  return <SubjectsList subjectHrefBase="/student/subjects" gradeId={gradeId} />;
}
