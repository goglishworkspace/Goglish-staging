import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type Review = {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  like_count: number;
  created_at: string;
};

export function useReviews(targetType: "course" | "teacher", targetId: string) {
  return useQuery({
    queryKey: ["reviews", targetType, targetId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Review[]>>("/api/reviews", {
        params: { target_type: targetType, target_id: targetId },
      });
      return data.data;
    },
    staleTime: 60 * 1000,
    enabled: !!targetId,
  });
}

export function useCreateReview(targetType: "course" | "teacher", targetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { rating: number; comment?: string }) => {
      const { data } = await api.post("/api/reviews", {
        target_type: targetType,
        target_id: targetId,
        rating: input.rating,
        comment: input.comment,
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reviews", targetType, targetId] }),
  });
}

export function useToggleReviewLike(targetType: "course" | "teacher", targetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { reviewId: string; liked: boolean }) => {
      const { data } = input.liked
        ? await api.post(`/api/reviews/${input.reviewId}/like`)
        : await api.delete(`/api/reviews/${input.reviewId}/like`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reviews", targetType, targetId] }),
  });
}

export function useReportReview() {
  return useMutation({
    mutationFn: async (input: { reviewId: string; reason?: string }) => {
      const { data } = await api.post(`/api/reviews/${input.reviewId}/report`, { reason: input.reason });
      return data;
    },
  });
}
