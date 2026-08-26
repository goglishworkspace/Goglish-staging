"use client";

import { useState } from "react";
import { Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useLeaderboard } from "@/lib/api/queries/leaderboard";
import { useSubjects } from "@/lib/api/queries/subjects";
import { useProfile } from "@/lib/api/queries/profile";

/** Shared between the public marketing page (app/(marketing)/leaderboard)
 * and the student/parent dashboard pages - see HonorBoardContent's comment
 * for why a dashboard sidebar/link can't just point at the marketing route
 * directly. */
export function LeaderboardContent() {
  const [scope, setScope] = useState<"global" | "subject">("global");
  const [subjectId, setSubjectId] = useState<string | undefined>(undefined);

  const { data: subjects } = useSubjects();
  const { data: profile } = useProfile();
  const { data: rows, isLoading } = useLeaderboard(scope, subjectId);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-h2 text-secondary dark:text-white">لوحة الصدارة</h1>
      <p className="mt-2 text-small text-muted-foreground">
        ترتيب الطلاب بإجمالي نقاط الخبرة (XP)، عالمياً أو داخل كل مادة على حدة.
      </p>

      <div className="mt-6 flex w-full flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setScope("global");
            setSubjectId(undefined);
          }}
          className={cn(
            "rounded-full border border-border px-4 py-2 text-small font-medium transition-colors",
            scope === "global" ? "bg-primary text-secondary" : "bg-transparent text-foreground hover:bg-muted",
          )}
        >
          عالمي
        </button>
        {subjects?.map((subject) => (
          <button
            key={subject.id}
            type="button"
            onClick={() => {
              setScope("subject");
              setSubjectId(subject.id);
            }}
            className={cn(
              "rounded-full border border-border px-4 py-2 text-small font-medium transition-colors",
              scope === "subject" && subjectId === subject.id
                ? "bg-primary text-secondary"
                : "bg-transparent text-foreground hover:bg-muted",
            )}
          >
            {subject.name}
          </button>
        ))}
      </div>

      <Card className="mt-6 w-full">
        <CardContent className="p-4 sm:p-6">
          {isLoading && (
            <div className="flex w-full flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          )}

          {!isLoading && !rows?.length && (
            <p className="py-8 text-center text-small text-muted-foreground">
              لا يوجد بيانات كافية لعرض لوحة الصدارة هنا لسه.
            </p>
          )}

          {!isLoading && !!rows?.length && (
            <ul className="flex w-full flex-col divide-y divide-border">
              {rows.map((row) => {
                const isMe = !!profile && row.user_id === profile.id;
                return (
                  <li
                    key={row.user_id}
                    className={cn(
                      "flex items-center gap-3 py-3",
                      isMe && "-mx-3 rounded-lg bg-primary/10 px-3",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full text-small font-bold",
                        row.rank === 1 && "bg-primary text-secondary",
                        row.rank !== 1 && "bg-muted text-muted-foreground",
                      )}
                    >
                      {row.rank === 1 ? <Crown className="size-4" /> : row.rank}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                      {row.name ?? "طالب"} {isMe && <span className="text-caption text-primary">(أنت)</span>}
                    </span>
                    <span className="shrink-0 text-small font-semibold text-secondary dark:text-white">
                      {row.xp} XP
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
