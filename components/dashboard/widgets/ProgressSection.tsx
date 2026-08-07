import Link from "next/link";
import { BarChart3, ListChecks } from "lucide-react";
import { WidgetCard, WidgetEmpty } from "./WidgetCard";
import type { StudentDashboard } from "@/lib/services/dashboard.service";

export function ProgressSection({ dashboard }: { dashboard: StudentDashboard }) {
  const weekly = dashboard.weekly_progress;
  const courses = dashboard.course_progress;
  const maxXp = Math.max(1, ...weekly.map((w) => w.xp));

  return (
    <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
      <WidgetCard icon={BarChart3} title="التقدم الأسبوعي (XP)">
        {weekly.length ? (
          <div className="flex h-32 w-full items-end gap-2">
            {weekly.map((w) => (
              <div key={w.week} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-primary"
                  style={{ height: `${Math.max(4, (w.xp / maxXp) * 100)}%` }}
                  title={`${w.xp} XP`}
                />
                <span className="text-caption text-muted-foreground">{w.week.split("-W")[1]}</span>
              </div>
            ))}
          </div>
        ) : (
          <WidgetEmpty text="مفيش نشاط في آخر 8 أسابيع" />
        )}
      </WidgetCard>

      <WidgetCard icon={ListChecks} title="تقدم الكورسات">
        {courses.length ? (
          <ul className="flex flex-col gap-3">
            {courses.map((c) => (
              <li key={c.course_id}>
                <div className="mb-1 flex items-center justify-between text-small">
                  <Link href={`/courses/${c.course_id}`} className="font-medium underline">
                    {c.course_title}
                  </Link>
                  <span className="text-muted-foreground">{c.completion_percent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${c.completion_percent}%` }} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <WidgetEmpty text="مش مشترك في أي كورس لسه" />
        )}
      </WidgetCard>
    </div>
  );
}
