"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useModerationQueue, useReviewComment, useBanFromComments, type ModerationComment } from "@/lib/api/queries/admin-comments";

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

function QueueItem({ comment }: { comment: ModerationComment }) {
  const reviewComment = useReviewComment();
  const banFromComments = useBanFromComments();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [banned, setBanned] = useState(false);

  const onApprove = () => {
    reviewComment.mutate(
      { commentId: comment.id, decision: "approved" },
      {
        onSuccess: () => toast.success("تم قبول التعليق"),
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر قبول التعليق")),
      },
    );
  };

  const onReject = () => {
    reviewComment.mutate(
      { commentId: comment.id, decision: "rejected", rejection_reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("تم رفض التعليق");
          setRejecting(false);
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر رفض التعليق")),
      },
    );
  };

  const onBan = () => {
    banFromComments.mutate(
      { user_id: comment.user_id, banned: true },
      {
        onSuccess: () => {
          setBanned(true);
          toast.success("تم حظر المستخدم من التعليقات");
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر حظر المستخدم")),
      },
    );
  };

  return (
    <Card className="w-full">
      <CardContent className="flex w-full flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {comment.is_teacher && (
            <Badge variant="secondary" className="text-caption">
              مدرس موثّق
            </Badge>
          )}
          {comment.parent_comment_id && (
            <Badge variant="outline" className="text-caption">
              رد
            </Badge>
          )}
          <span className="text-caption text-muted-foreground">
            {new Date(comment.created_at).toLocaleString("ar-EG")}
          </span>
        </div>

        <p className="text-small text-foreground">{comment.content}</p>

        {rejecting ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Textarea placeholder="سبب الرفض (اختياري)" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="flex-1" />
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setRejecting(false)}>
                إلغاء
              </Button>
              <Button variant="destructive" disabled={reviewComment.isPending} onClick={onReject}>
                تأكيد الرفض
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={reviewComment.isPending} onClick={onApprove}>
              موافقة
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setRejecting(true)}>
              رفض
            </Button>
            <Button size="sm" variant="outline" disabled={banned || banFromComments.isPending} onClick={onBan}>
              <Ban className="size-3.5" />
              {banned ? "تم الحظر من التعليقات" : "حظر من التعليقات"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminCommentsModerationPage() {
  const { data: queue, isLoading } = useModerationQueue();

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-h2 text-secondary dark:text-white">مراجعة التعليقات</h1>
      <p className="text-small text-muted-foreground">
        تعليقات المدرسين تظهر أولاً حسب سياسة الأولوية في المراجعة.
      </p>

      {isLoading && (
        <div className="flex w-full flex-col gap-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {!isLoading && !queue?.length && (
        <p className="py-8 text-center text-small text-muted-foreground">مفيش تعليقات في انتظار المراجعة.</p>
      )}

      {!isLoading && !!queue?.length && (
        <div className="flex w-full flex-col gap-3">
          {queue.map((comment) => (
            <QueueItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
}
