import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type ModerationComment = {
  id: string;
  lesson_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  status: "pending" | "approved" | "rejected";
  is_teacher: boolean;
  created_at: string;
};

export function useModerationQueue(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["comments-moderation-queue"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<ModerationComment[]>>("/api/comments/moderation-queue");
      return data.data;
    },
    staleTime: 15 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useReviewComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { commentId: string; decision: "approved" | "rejected"; rejection_reason?: string }) => {
      const { data } = await api.post(`/api/comments/${input.commentId}/review`, {
        decision: input.decision,
        rejection_reason: input.rejection_reason,
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments-moderation-queue"] }),
  });
}

export function useBanFromComments() {
  return useMutation({
    mutationFn: async (input: { user_id: string; banned: boolean; reason?: string }) => {
      const { data } = await api.post("/api/moderation/comment-ban", input);
      return data;
    },
  });
}
