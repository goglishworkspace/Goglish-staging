import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type LessonComment = {
  id: string;
  lesson_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  is_teacher: boolean;
  created_at: string;
};

export function useLessonComments(lessonId: string) {
  return useQuery({
    queryKey: ["lesson-comments", lessonId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<LessonComment[]>>(`/api/lessons/${lessonId}/comments`);
      return data.data;
    },
    enabled: !!lessonId,
  });
}

export function useCreateLessonComment(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { content: string; parent_comment_id?: string }) => {
      const { data } = await api.post(`/api/lessons/${lessonId}/comments`, input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-comments", lessonId] }),
  });
}

export function useReportComment() {
  return useMutation({
    mutationFn: async (input: { commentId: string; reason?: string }) => {
      const { data } = await api.post(`/api/comments/${input.commentId}/report`, {
        reason: input.reason,
      });
      return data;
    },
  });
}

export function useDeleteLessonComment(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const { data } = await api.delete(`/api/comments/${commentId}`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-comments", lessonId] }),
  });
}
