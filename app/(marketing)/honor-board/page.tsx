"use client";

import Link from "next/link";
import { AvatarImage } from "@/components/shared/AvatarImage";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHonorBoard } from "@/lib/api/queries/honor-board";
import { HonorBoardPodium } from "@/components/landing/HonorBoardPodium";

export default function HonorBoardPage() {
  const { data: entries, isLoading, isError } = useHonorBoard(20);
  const podiumEntries = entries?.slice(0, 3) ?? [];
  const restEntries = entries?.slice(3) ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-center text-h2 text-secondary dark:text-white">لوحة الشرف</h1>
      <p className="mt-2 text-center text-small text-muted-foreground">
        أعلى الطلاب في مجموع كل المواد بإجمالي نقاط الخبرة
      </p>

      {isLoading && (
        <div className="mt-10 flex w-full flex-col gap-4">
          <Skeleton className="h-72 w-full rounded-3xl" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && (isError || !entries?.length) && (
        <p className="mt-10 text-center text-small text-muted-foreground">لوحة الشرف غير متاحة حالياً.</p>
      )}

      {!isLoading && !isError && !!entries?.length && (
        <>
          <div className="mt-10 w-full">
            <HonorBoardPodium entries={podiumEntries} />
          </div>

          {!!restEntries.length && (
            <div className="mt-6 flex w-full flex-col gap-2">
              {restEntries.map((entry) => (
                <Card key={entry.user_id} className="w-full">
                  <CardContent className="flex items-center gap-4 p-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-small font-semibold text-muted-foreground">
                      {entry.rank}
                    </div>
                    <AvatarImage
                      src={entry.avatar_url}
                      initials={(entry.name ?? "ط").charAt(0)}
                      alt={entry.name ?? "طالب"}
                      size={36}
                    />
                    <div className="min-w-0 flex-1 text-start">
                      <p className="truncate font-medium text-foreground">{entry.name ?? "طالب"}</p>
                    </div>
                    <p className="shrink-0 text-small font-semibold text-muted-foreground">
                      {entry.xp.toLocaleString("ar-EG")} XP
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <p className="mt-8 text-center text-small text-muted-foreground">
        عايز تشوف ترتيبك في كل مادة على حدة؟{" "}
        <Link href="/leaderboard" className="font-semibold text-primary underline">
          لوحة الصدارة الكاملة
        </Link>
      </p>
    </div>
  );
}
