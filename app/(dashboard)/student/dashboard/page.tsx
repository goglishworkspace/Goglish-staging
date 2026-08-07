"use client";

import { useDashboard } from "@/lib/api/queries/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { ContinueSection } from "@/components/dashboard/widgets/ContinueSection";
import { UpcomingSection } from "@/components/dashboard/widgets/UpcomingSection";
import { ProgressSection } from "@/components/dashboard/widgets/ProgressSection";
import { GamificationSection } from "@/components/dashboard/widgets/GamificationSection";
import { NotificationsWidget } from "@/components/dashboard/widgets/NotificationsWidget";
import { RecommendedCoursesWidget } from "@/components/dashboard/widgets/RecommendedCoursesWidget";

export default function DashboardPage() {
  const { data: dashboard, isLoading, isError } = useDashboard();

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-h2 text-secondary dark:text-white">لوحة التحكم</h1>

      {isLoading && (
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <p className="text-small text-muted-foreground">تعذر تحميل لوحة التحكم حالياً.</p>
      )}

      {!isLoading && dashboard && (
        <>
          <ContinueSection dashboard={dashboard} />
          <UpcomingSection dashboard={dashboard} />
          <ProgressSection dashboard={dashboard} />
          <GamificationSection dashboard={dashboard} />
          <NotificationsWidget dashboard={dashboard} />
          <RecommendedCoursesWidget dashboard={dashboard} />
        </>
      )}
    </div>
  );
}
