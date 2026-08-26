"use client";

import Link from "next/link";
import { useDashboard } from "@/lib/api/queries/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ProgressPage() {
  const { data: dashboard, isLoading, isError } = useDashboard();
  const weekly = dashboard?.weekly_progress ?? [];
  const maxXp = Math.max(1, ...weekly.map((w) => w.xp));

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-h2 text-secondary dark:text-white">التقدم</h1>

      {isLoading && (
        <div className="flex w-full flex-col gap-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      )}

      {!isLoading && isError && <p className="text-small text-muted-foreground">تعذر تحميل التقدم.</p>}

      {!isLoading && dashboard && (
        <>
          <Card className="w-full">
            <CardContent className="p-6">
              <h2 className="mb-4 text-h3 text-secondary dark:text-white">التقدم الأسبوعي (XP)</h2>
              {weekly.length ? (
                <div className="flex h-40 w-full items-end gap-2">
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
                <p className="text-small text-muted-foreground">مفيش نشاط في آخر 8 أسابيع.</p>
              )}
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardContent className="p-6">
              <h2 className="mb-4 text-h3 text-secondary dark:text-white">تقدم الكورسات</h2>
              {dashboard.course_progress.length ? (
                <ul className="flex flex-col gap-4">
                  {dashboard.course_progress.map((c) => (
                    <li key={c.course_id}>
                      <div className="mb-1 flex items-center justify-between">
                        <Link href={`/courses/${c.course_id}`} className="font-semibold underline">
                          {c.course_title}
                        </Link>
                        <span className="text-small text-muted-foreground">
                          {c.completed_lessons}/{c.total_lessons} دروس - {c.completion_percent}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${c.completion_percent}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-small text-muted-foreground">مش مشترك في أي كورس لسه.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
