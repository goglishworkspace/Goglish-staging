"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourseExams } from "@/lib/api/queries/assessments";

export function CourseExams({ courseId }: { courseId: string }) {
  const { data: exams, isLoading } = useCourseExams(courseId);

  if (isLoading) return <Skeleton className="h-12 w-full rounded-lg" />;
  if (!exams?.length) return <p className="text-small text-muted-foreground">لا يوجد امتحانات لهذا الكورس حالياً.</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {exams.map((exam) => (
        <Button
          key={exam.id}
          nativeButton={false}
          render={<Link href={`/exams/${exam.id}/attempt`} />}
        >
          <GraduationCap />
          {exam.title}
        </Button>
      ))}
    </div>
  );
}
