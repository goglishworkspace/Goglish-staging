"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGamificationMe } from "@/lib/api/queries/gamification";

export function GamificationHeader() {
  const { data, isLoading, isError } = useGamificationMe();

  if (isLoading) {
    return <Skeleton className="h-28 w-full rounded-xl" />;
  }

  if (isError || !data) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:justify-between sm:text-start">
          <p className="text-small text-muted-foreground">
            سجّل دخول عشان تشوف نقاط الخبرة والمستوى والـ Streak بتاعك.
          </p>
          <Button nativeButton={false} render={<Link href="/login" />}>
            تسجيل الدخول
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { xp_total, current_streak_days, level, next_level } = data;
  const rangeStart = level?.min_xp ?? 0;
  const rangeEnd = next_level?.min_xp ?? rangeStart + Math.max(xp_total - rangeStart, 1);
  const progressPercent = Math.min(
    100,
    Math.max(0, ((xp_total - rangeStart) / Math.max(1, rangeEnd - rangeStart)) * 100),
  );

  return (
    <Card className="w-full">
      <CardContent className="flex w-full flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-caption text-muted-foreground">المستوى الحالي</p>
            <p className="text-h3 text-secondary dark:text-white">{level?.title ?? "مبتدئ"}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
            <Flame className="size-4 text-primary" />
            <span className="text-small font-semibold">{current_streak_days} يوم متتالي</span>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-small text-muted-foreground">
            <span>{xp_total} XP</span>
            {next_level && <span>{next_level.min_xp} XP لـ{next_level.title}</span>}
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
