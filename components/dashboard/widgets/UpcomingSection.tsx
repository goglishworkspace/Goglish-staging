import Link from "next/link";
import { FileQuestion, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WidgetCard, WidgetEmpty } from "./WidgetCard";
import type { StudentDashboard } from "@/lib/services/dashboard.service";

export function UpcomingSection({ dashboard }: { dashboard: StudentDashboard }) {
  const quiz = dashboard.upcoming_quiz as { id: string; title: string } | null;
  const exam = dashboard.upcoming_exam as { id: string; title: string } | null;

  return (
    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
      <WidgetCard icon={FileQuestion} title="الاختبار القادم">
        {quiz ? (
          <Button className="w-full" nativeButton={false} render={<Link href={`/quizzes/${quiz.id}/attempt`} />}>
            {quiz.title}
          </Button>
        ) : (
          <WidgetEmpty text="مفيش اختبارات مستنياك" />
        )}
      </WidgetCard>

      <WidgetCard icon={GraduationCap} title="الامتحان القادم">
        {exam ? (
          <Button
            variant="outline"
            className="w-full"
            nativeButton={false}
            render={<Link href={`/exams/${exam.id}/attempt`} />}
          >
            {exam.title}
          </Button>
        ) : (
          <WidgetEmpty text="مفيش امتحانات مستنياك" />
        )}
      </WidgetCard>
    </div>
  );
}
