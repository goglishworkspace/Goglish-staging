import Link from "next/link";
import { Sparkles } from "lucide-react";
import { WidgetCard, WidgetEmpty } from "./WidgetCard";
import type { StudentDashboard } from "@/lib/services/dashboard.service";

export function RecommendedCoursesWidget({ dashboard }: { dashboard: StudentDashboard }) {
  const courses = dashboard.recommended_courses;

  return (
    <WidgetCard icon={Sparkles} title="كورسات مقترحة لك">
      {courses.length ? (
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/courses/${c.id}`}
              className="rounded-lg border border-border p-3 text-small font-medium hover:bg-muted"
            >
              {c.title}
            </Link>
          ))}
        </div>
      ) : (
        <WidgetEmpty text="مفيش اقتراحات جديدة دلوقتي" />
      )}
    </WidgetCard>
  );
}
