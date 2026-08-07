"use client";

import { Award, Star, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GamificationHeader } from "@/components/marketing/GamificationHeader";
import {
  useAchievements,
  useBadgeCatalog,
  useMyBadges,
  getBadgeDetails,
  type AchievementEvent,
} from "@/lib/api/queries/gamification";

function eventIcon(event: AchievementEvent) {
  if (event.type === "badge") return <span className="text-lg">{event.icon}</span>;
  return <Trophy className="size-4 text-primary" />;
}

function eventLabel(event: AchievementEvent) {
  if (event.type === "badge") return `حصلت على شارة "${event.title}"`;
  return `وصلت للمستوى ${event.level_number}: ${event.title}`;
}

export default function AchievementsPage() {
  const { data: myBadges, isLoading: myBadgesLoading } = useMyBadges();
  const { data: catalog, isLoading: catalogLoading } = useBadgeCatalog();
  const { data: feed, isLoading: feedLoading } = useAchievements();

  const earnedCodes = new Set((myBadges ?? []).map((row) => getBadgeDetails(row)?.code).filter(Boolean));

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-h2 text-secondary dark:text-white">الإنجازات والشارات</h1>

      <div className="mt-6">
        <GamificationHeader />
      </div>

      <section className="mt-8 w-full">
        <h2 className="mb-4 flex items-center gap-2 text-h3 text-secondary dark:text-white">
          <Award className="size-5 text-primary" />
          الشارات
        </h2>
        {catalogLoading || myBadgesLoading ? (
          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {catalog?.map((badge) => {
              const earned = earnedCodes.has(badge.code);
              return (
                <Card key={badge.id} className={earned ? "w-full" : "w-full opacity-40 grayscale"}>
                  <CardContent className="flex flex-col items-center gap-1.5 p-4 text-center">
                    <span className="text-3xl">{badge.icon}</span>
                    <p className="text-small font-semibold text-foreground">{badge.title}</p>
                    <p className="text-caption text-muted-foreground">{badge.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10 w-full">
        <h2 className="mb-4 flex items-center gap-2 text-h3 text-secondary dark:text-white">
          <Star className="size-5 text-primary" />
          سجل الإنجازات
        </h2>
        {feedLoading && (
          <div className="flex w-full flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        )}
        {!feedLoading && !feed?.length && (
          <p className="text-small text-muted-foreground">
            {feed === undefined ? "سجّل دخول عشان تشوف سجل إنجازاتك." : "مفيش إنجازات لسه، كمّل مذاكرة وهتوصل!"}
          </p>
        )}
        {!feedLoading && !!feed?.length && (
          <ul className="flex w-full flex-col gap-2">
            {feed.map((event, i) => (
              <li
                key={`${event.type}-${event.at}-${i}`}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                {eventIcon(event)}
                <span className="min-w-0 flex-1 text-small text-foreground">{eventLabel(event)}</span>
                <span className="shrink-0 text-caption text-muted-foreground">
                  {new Date(event.at).toLocaleDateString("ar-EG")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
