"use client";

import Link from "next/link";
import { Clock, XCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyComments, getMyCommentLessonTitle } from "@/lib/api/queries/my-comments";

const STATUS_META = {
  approved: { icon: CheckCircle2, label: "موافَق عليه", variant: "default" as const },
  pending: { icon: Clock, label: "قيد المراجعة", variant: "outline" as const },
  rejected: { icon: XCircle, label: "مرفوض", variant: "destructive" as const },
};

export default function TeacherCommentsPage() {
  const { data: comments, isLoading } = useMyComments();

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-h2 text-secondary dark:text-white">تعليقاتي على الدروس</h1>

      {isLoading && (
        <div className="flex w-full flex-col gap-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      )}

      {!isLoading && !comments?.length && (
        <p className="py-8 text-center text-small text-muted-foreground">لسه معلقتش على أي درس.</p>
      )}

      {!isLoading && !!comments?.length && (
        <ul className="flex w-full flex-col gap-3">
          {comments.map((comment) => {
            const meta = STATUS_META[comment.status];
            const Icon = meta.icon;
            return (
              <li key={comment.id}>
                <Card className="w-full">
                  <CardContent className="flex flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/lessons/${comment.lesson_id}`} className="font-medium text-foreground underline">
                        {getMyCommentLessonTitle(comment)}
                      </Link>
                      <Badge variant={meta.variant}>
                        <Icon className="size-3" />
                        {meta.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-caption">
                        مدرس موثّق
                      </Badge>
                    </div>
                    <p className="text-small text-foreground">{comment.content}</p>
                    {comment.rejection_reason && (
                      <p className="text-caption text-muted-foreground">السبب: {comment.rejection_reason}</p>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
