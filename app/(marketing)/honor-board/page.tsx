"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarImage } from "@/components/shared/AvatarImage";
import { cn } from "@/lib/utils";
import { useHonorBoard } from "@/lib/api/queries/honor-board";

const RANK_STYLES = [
  "bg-primary text-secondary",
  "bg-secondary text-brand-accent",
  "bg-muted text-foreground",
];

export default function HonorBoardPage() {
  const { data: entries, isLoading, isError } = useHonorBoard(20);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-center text-h2 text-secondary dark:text-white">لوحة الشرف</h1>
      <p className="mt-2 text-center text-small text-muted-foreground">
        أعلى الطلاب في مجموع كل المواد بإجمالي نقاط الخبرة
      </p>

      <div className="mt-10 flex w-full flex-col gap-4">
        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}

        {!isLoading && (isError || !entries?.length) && (
          <p className="text-center text-small text-muted-foreground">لوحة الشرف غير متاحة حالياً.</p>
        )}

        {!isLoading &&
          !isError &&
          entries?.map((entry, i) => (
            <Card key={entry.user_id} className="w-full">
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full text-h3",
                    RANK_STYLES[i] ?? "bg-muted text-foreground",
                  )}
                >
                  {i === 0 ? <Trophy className="size-5" /> : entry.rank}
                </div>
                <AvatarImage
                  src={entry.avatar_url}
                  initials={(entry.name ?? "ط").charAt(0)}
                  alt={entry.name ?? "طالب"}
                  size={40}
                />
                <div className="min-w-0 flex-1 text-start">
                  <p className="truncate font-semibold text-foreground">{entry.name ?? "طالب"}</p>
                  <p className="text-small text-muted-foreground">{entry.xp.toLocaleString("ar-EG")} نقطة خبرة</p>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      <p className="mt-8 text-center text-small text-muted-foreground">
        عايز تشوف ترتيبك في كل مادة على حدة؟{" "}
        <Link href="/leaderboard" className="font-semibold text-primary underline">
          لوحة الصدارة الكاملة
        </Link>
      </p>
    </div>
  );
}
