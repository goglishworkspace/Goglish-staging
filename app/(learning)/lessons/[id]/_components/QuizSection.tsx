"use client";

import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLessonQuizzes } from "@/lib/api/queries/assessments";

export function QuizSection({ lessonId }: { lessonId: string }) {
  const { data: quizzes, isLoading } = useLessonQuizzes(lessonId);

  if (isLoading) return <Skeleton className="h-12 w-full rounded-lg" />;
  if (!quizzes?.length) return null;

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-small font-semibold text-muted-foreground">
        <FileQuestion className="size-4" />
        اختبارات الدرس
      </h3>
      <div className="flex flex-wrap gap-2">
        {quizzes.map((quiz) => (
          <Button
            key={quiz.id}
            variant="outline"
            nativeButton={false}
            render={<Link href={`/quizzes/${quiz.id}/attempt`} />}
          >
            {quiz.title}
          </Button>
        ))}
      </div>
    </div>
  );
}
