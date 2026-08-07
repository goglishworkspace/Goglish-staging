"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Clock, XCircle, Flag, Trash2, Reply } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/lib/api/queries/profile";
import {
  useLessonComments,
  useCreateLessonComment,
  useReportComment,
  useDeleteLessonComment,
  type LessonComment,
} from "@/lib/api/queries/lesson-comments";

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

function StatusRow({ comment, lessonId, id }: { comment: LessonComment; lessonId: string; id?: string }) {
  const deleteComment = useDeleteLessonComment(lessonId);

  const onDelete = () => {
    deleteComment.mutate(comment.id, {
      onSuccess: () => toast.success("تم حذف تعليقك"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر حذف التعليق")),
    });
  };

  return (
    <div id={id} className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
      {comment.status === "pending" ? (
        <Clock className="mt-0.5 size-4 shrink-0 text-warning" />
      ) : (
        <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
      )}
      <div className="min-w-0 flex-1">
        <Badge variant={comment.status === "pending" ? "outline" : "destructive"}>
          {comment.status === "pending" ? "تعليقك قيد المراجعة" : "تعليقك مرفوض"}
        </Badge>
        <p className="mt-1 text-small">{comment.content}</p>
        {comment.rejection_reason && (
          <p className="mt-1 text-caption text-muted-foreground">السبب: {comment.rejection_reason}</p>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={deleteComment.isPending}
          className="mt-1 flex items-center gap-1 text-caption text-muted-foreground hover:text-destructive disabled:opacity-50"
        >
          <Trash2 className="size-3.5" />
          حذف
        </button>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = { pending: "قيد المراجعة", rejected: "مرفوض" };

/** A non-approved comment the viewer can see only because they manage this
 * lesson (course owner/team) - not their own comment, so no delete button,
 * but they still need to be able to reply before an admin approves it
 * (that's the whole point of a teacher reaching a student's comment). */
function PendingCommentRow({
  comment,
  onReplyClick,
  id,
}: {
  comment: LessonComment;
  onReplyClick: () => void;
  id?: string;
}) {
  return (
    <div id={id} className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
      {comment.status === "pending" ? (
        <Clock className="mt-0.5 size-4 shrink-0 text-warning" />
      ) : (
        <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-small font-semibold">{comment.is_teacher ? "مدرس" : "طالب"}</span>
          <Badge variant={comment.status === "pending" ? "outline" : "destructive"}>
            {STATUS_LABEL[comment.status]}
          </Badge>
        </div>
        <p className="mt-1 text-small">{comment.content}</p>
        <button
          type="button"
          onClick={onReplyClick}
          className="mt-1 flex items-center gap-1 text-caption text-muted-foreground hover:text-foreground"
        >
          <Reply className="size-3.5" />
          رد
        </button>
      </div>
    </div>
  );
}

function CommentRow({
  comment,
  isOwn,
  lessonId,
  onReplyClick,
  nested,
  id,
}: {
  comment: LessonComment;
  isOwn: boolean;
  lessonId: string;
  onReplyClick?: () => void;
  nested?: boolean;
  id?: string;
}) {
  const reportComment = useReportComment();
  const deleteComment = useDeleteLessonComment(lessonId);
  const [reported, setReported] = useState(false);

  const onReport = () => {
    reportComment.mutate(
      { commentId: comment.id },
      {
        onSuccess: () => {
          setReported(true);
          toast.success("تم إرسال البلاغ");
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر إرسال البلاغ")),
      },
    );
  };

  const onDelete = () => {
    deleteComment.mutate(comment.id, {
      onSuccess: () => toast.success("تم حذف تعليقك"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر حذف التعليق")),
    });
  };

  return (
    <li id={id} className={nested ? "flex items-start gap-2 ps-6" : "flex items-start gap-2"}>
      <MessageCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-small font-semibold">{isOwn ? "أنت" : comment.is_teacher ? "مدرس" : "طالب"}</span>
          {comment.is_teacher && (
            <Badge variant="secondary" className="text-caption">
              مدرس موثّق
            </Badge>
          )}
        </div>
        <p className="text-small">{comment.content}</p>
        <div className="mt-1 flex items-center gap-3 text-caption text-muted-foreground">
          {!nested && onReplyClick && (
            <button type="button" onClick={onReplyClick} className="flex items-center gap-1 hover:text-foreground">
              <Reply className="size-3.5" />
              رد
            </button>
          )}
          {!isOwn && (
            <button
              type="button"
              onClick={onReport}
              disabled={reported || reportComment.isPending}
              className="flex items-center gap-1 hover:text-foreground disabled:opacity-50"
            >
              <Flag className="size-3.5" />
              {reported ? "تم الإبلاغ" : "بلاغ"}
            </button>
          )}
          {isOwn && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleteComment.isPending}
              className="flex items-center gap-1 hover:text-destructive disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
              حذف
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function ReplyForm({ lessonId, parentCommentId, onDone }: { lessonId: string; parentCommentId: string; onDone: () => void }) {
  const createComment = useCreateLessonComment(lessonId);
  const [content, setContent] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    createComment.mutate(
      { content: content.trim(), parent_comment_id: parentCommentId },
      {
        onSuccess: (res) => {
          setContent("");
          onDone();
          const status = (res as { data?: { status?: string } })?.data?.status;
          toast.success(status === "approved" ? "تم نشر ردك" : "تم إرسال ردك، هيظهر بعد موافقة الأدمن");
        },
        onError: (err: unknown) => toast.error(apiErrorMessage(err, "تعذر إرسال الرد")),
      },
    );
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 ps-6">
      <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="اكتب ردك..." rows={2} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          إلغاء
        </Button>
        <Button type="submit" disabled={createComment.isPending}>
          إرسال الرد
        </Button>
      </div>
    </form>
  );
}

export function CommentsSection({ lessonId, focusCommentId }: { lessonId: string; focusCommentId?: string }) {
  const { data: profile } = useProfile();
  const { data: comments, isLoading } = useLessonComments(lessonId);
  const createComment = useCreateLessonComment(lessonId);
  const [content, setContent] = useState("");

  // Arrived here from a "students' comments" notification link - the reply
  // box on the right thread should default open, so the teacher lands ready
  // to reply instead of having to hunt for the comment. `undefined` means
  // "no manual toggle yet" - once the teacher clicks any reply/cancel button,
  // that click always wins over the auto-opened default.
  const [manualReplyingTo, setManualReplyingTo] = useState<string | null | undefined>(undefined);
  const focusedTarget = focusCommentId ? comments?.find((c) => c.id === focusCommentId) : undefined;
  const autoReplyTarget = focusedTarget ? (focusedTarget.parent_comment_id ?? focusedTarget.id) : null;
  const replyingTo = manualReplyingTo !== undefined ? manualReplyingTo : autoReplyTarget;
  const setReplyingTo = (id: string | null) => setManualReplyingTo(id);

  // Scrolling to the comment is a genuine external-system side effect (not
  // state derivation), so it stays in an effect - guarded so a later refetch
  // (e.g. after the reply is submitted) doesn't re-scroll.
  const scrolledRef = useRef(false);
  useEffect(() => {
    if (!focusCommentId || !focusedTarget || scrolledRef.current) return;
    scrolledRef.current = true;
    requestAnimationFrame(() => {
      document.getElementById(`comment-${focusCommentId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [focusCommentId, focusedTarget]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    createComment.mutate(
      { content: content.trim() },
      {
        onSuccess: (res) => {
          setContent("");
          const status = (res as { data?: { status?: string } })?.data?.status;
          toast.success(
            status === "approved"
              ? "تم نشر تعليقك"
              : "تم إرسال تعليقك، هيظهر بعد موافقة الأدمن",
          );
        },
        onError: (err: unknown) => toast.error(apiErrorMessage(err, "تعذر إرسال التعليق")),
      },
    );
  };

  // Approved top-level comments show for everyone; a pending/rejected row
  // only ever appears in this response for its own author, or for the
  // lesson's teacher/team (RLS-enforced server-side, see
  // lesson_comments_read) - safe to render without re-checking who can see
  // what, just which display each row gets.
  const topLevel = comments?.filter((c) => !c.parent_comment_id) ?? [];
  const ownPendingOrRejected = topLevel.filter((c) => c.status !== "approved" && c.user_id === profile?.id);
  // Everything else visible: approved comments (for anyone) plus other
  // people's pending/rejected ones (visible only to the teacher who can act
  // on them) - kept in one chronological thread rather than split out.
  const mainThread = topLevel.filter((c) => c.status === "approved" || c.user_id !== profile?.id);
  const repliesOf = (parentId: string) => (comments ?? []).filter((c) => c.parent_comment_id === parentId);

  return (
    <div className="flex w-full flex-col gap-4">
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="اكتب تعليقك على الدرس..."
          rows={3}
        />
        <Button type="submit" disabled={createComment.isPending} className="self-end">
          إرسال التعليق
        </Button>
      </form>

      {ownPendingOrRejected.length > 0 && (
        <div className="flex flex-col gap-2">
          {ownPendingOrRejected.map((c) => (
            <StatusRow key={c.id} comment={c} lessonId={lessonId} />
          ))}
        </div>
      )}

      {isLoading && <Skeleton className="h-16 w-full" />}

      {!isLoading && !mainThread.length && (
        <p className="text-small text-muted-foreground">لا يوجد تعليقات لسه.</p>
      )}

      {!isLoading && !!mainThread.length && (
        <ul className="flex flex-col gap-4">
          {mainThread.map((c) => (
            <li key={c.id} className="flex flex-col gap-2">
              <ul className="flex flex-col gap-2">
                {c.status === "approved" ? (
                  <CommentRow
                    id={`comment-${c.id}`}
                    comment={c}
                    isOwn={c.user_id === profile?.id}
                    lessonId={lessonId}
                    onReplyClick={() => setReplyingTo(c.id === replyingTo ? null : c.id)}
                  />
                ) : (
                  <PendingCommentRow
                    id={`comment-${c.id}`}
                    comment={c}
                    onReplyClick={() => setReplyingTo(c.id === replyingTo ? null : c.id)}
                  />
                )}
              </ul>

              {replyingTo === c.id && (
                <ReplyForm lessonId={lessonId} parentCommentId={c.id} onDone={() => setReplyingTo(null)} />
              )}

              {repliesOf(c.id).length > 0 && (
                <ul className="flex flex-col gap-2">
                  {repliesOf(c.id).map((reply) => {
                    const isOwnReply = reply.user_id === profile?.id;
                    if (reply.status === "approved") {
                      return (
                        <CommentRow
                          key={reply.id}
                          id={`comment-${reply.id}`}
                          comment={reply}
                          isOwn={isOwnReply}
                          lessonId={lessonId}
                          nested
                        />
                      );
                    }
                    if (isOwnReply) {
                      return (
                        <div key={reply.id} className="ps-6">
                          <StatusRow id={`comment-${reply.id}`} comment={reply} lessonId={lessonId} />
                        </div>
                      );
                    }
                    return (
                      <div key={reply.id} className="ps-6">
                        <PendingCommentRow
                          id={`comment-${reply.id}`}
                          comment={reply}
                          onReplyClick={() => setReplyingTo(c.id === replyingTo ? null : c.id)}
                        />
                      </div>
                    );
                  })}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
