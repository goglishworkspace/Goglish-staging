import Link from "next/link";
import { PlayCircle, BookOpenCheck, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WidgetCard, WidgetEmpty } from "./WidgetCard";
import type { StudentDashboard } from "@/lib/services/dashboard.service";

export function ContinueSection({ dashboard }: { dashboard: StudentDashboard }) {
  const lesson = dashboard.continue_learning as {
    lesson_id: string;
    progress_seconds: number;
    lessons: { id: string; title: string } | null;
  } | null;
  const latest = dashboard.latest_lesson as { id: string; title: string } | null;
  const watching = dashboard.continue_watching as Array<{
    course_id: string;
    courses: { id: string; title: string; slug: string } | null;
  }>;

  return (
    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
      <WidgetCard icon={PlayCircle} title="أكمل التعلم">
        {lesson?.lessons ? (
          <Button className="w-full" nativeButton={false} render={<Link href={`/lessons/${lesson.lesson_id}`} />}>
            {lesson.lessons.title}
          </Button>
        ) : (
          <WidgetEmpty text="مفيش درس شغال حالياً، ابدأ درس جديد!" />
        )}
      </WidgetCard>

      <WidgetCard icon={BookOpenCheck} title="أحدث درس">
        {latest ? (
          <Button
            variant="outline"
            className="w-full"
            nativeButton={false}
            render={<Link href={`/lessons/${latest.id}`} />}
          >
            {latest.title}
          </Button>
        ) : (
          <WidgetEmpty text="مفيش دروس جديدة دلوقتي" />
        )}
      </WidgetCard>

      <WidgetCard icon={History} title="أكمل المشاهدة">
        {watching.length ? (
          <ul className="flex flex-col gap-2">
            {watching.slice(0, 3).map((item) =>
              item.courses ? (
                <li key={item.course_id}>
                  <Link href={`/courses/${item.courses.id}`} className="text-small font-medium underline">
                    {item.courses.title}
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        ) : (
          <WidgetEmpty text="مفيش كورسات اتفتحت مؤخراً" />
        )}
      </WidgetCard>
    </div>
  );
}
