"use client";

import { useState } from "react";
import { Flag, Star, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/lib/api/queries/profile";
import {
  useReviews,
  useCreateReview,
  useToggleReviewLike,
  useReportReview,
  type Review,
} from "@/lib/api/queries/reviews";

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

function StarPicker({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const rating = i + 1;
        return (
          <button key={rating} type="button" onClick={() => onChange(rating)} aria-label={`${rating} نجوم`}>
            <Star className={`size-6 ${rating <= value ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </button>
        );
      })}
    </div>
  );
}

function WriteReviewForm({ targetType, targetId }: { targetType: "course" | "teacher"; targetId: string }) {
  const createReview = useCreateReview(targetType, targetId);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      toast.error("اختار تقييم بالنجوم الأول");
      return;
    }
    createReview.mutate(
      { rating, comment: comment.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("تم إرسال تقييمك");
          setOpen(false);
          setRating(0);
          setComment("");
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر إرسال التقييم")),
      },
    );
  };

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        اكتب تقييم
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-3 rounded-lg border border-border p-4">
      <StarPicker value={rating} onChange={setRating} />
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="اكتب رأيك (اختياري)..."
        rows={3}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          إلغاء
        </Button>
        <Button type="submit" disabled={createReview.isPending}>
          إرسال التقييم
        </Button>
      </div>
    </form>
  );
}

function ReviewRow({
  review,
  targetType,
  targetId,
  isOwn,
}: {
  review: Review;
  targetType: "course" | "teacher";
  targetId: string;
  isOwn: boolean;
}) {
  const toggleLike = useToggleReviewLike(targetType, targetId);
  const reportReview = useReportReview();
  const [liked, setLiked] = useState(false);
  const [reported, setReported] = useState(false);

  const onToggleLike = () => {
    const nextLiked = !liked;
    toggleLike.mutate(
      { reviewId: review.id, liked: nextLiked },
      {
        onSuccess: () => setLiked(nextLiked),
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر تسجيل الإعجاب")),
      },
    );
  };

  const onReport = () => {
    reportReview.mutate(
      { reviewId: review.id },
      {
        onSuccess: () => {
          setReported(true);
          toast.success("تم إرسال البلاغ");
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر إرسال البلاغ")),
      },
    );
  };

  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`size-4 ${i < review.rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
          />
        ))}
      </div>
      {review.comment && <p className="mt-1 text-small text-foreground">{review.comment}</p>}
      <div className="mt-2 flex items-center gap-3 text-caption text-muted-foreground">
        <button
          type="button"
          onClick={onToggleLike}
          disabled={isOwn || toggleLike.isPending}
          className="flex items-center gap-1 hover:text-foreground disabled:opacity-50"
        >
          <ThumbsUp className={`size-3.5 ${liked ? "fill-primary text-primary" : ""}`} />
          {review.like_count + (liked ? 1 : 0)}
        </button>
        {!isOwn && (
          <button
            type="button"
            onClick={onReport}
            disabled={reported || reportReview.isPending}
            className="flex items-center gap-1 hover:text-foreground disabled:opacity-50"
          >
            <Flag className="size-3.5" />
            {reported ? "تم الإبلاغ" : "بلاغ"}
          </button>
        )}
      </div>
    </li>
  );
}

export function ReviewsSection({ targetType, targetId }: { targetType: "course" | "teacher"; targetId: string }) {
  const { data: reviews, isLoading } = useReviews(targetType, targetId);
  const { data: profile } = useProfile();

  return (
    <div className="flex w-full flex-col gap-4">
      <WriteReviewForm targetType={targetType} targetId={targetId} />

      {isLoading && (
        <div className="flex w-full flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && !reviews?.length && (
        <p className="text-small text-muted-foreground">لا يوجد تقييمات لسه.</p>
      )}

      {!isLoading && !!reviews?.length && (
        <ul className="flex w-full flex-col gap-3">
          {reviews.map((review) => (
            <ReviewRow
              key={review.id}
              review={review}
              targetType={targetType}
              targetId={targetId}
              isOwn={review.user_id === profile?.id}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
