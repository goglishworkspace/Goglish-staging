import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type MyComment = {
  id: string;
  lesson_id: string;
  content: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
  lessons: { title: string } | { title: string }[] | null;
};

export function getMyCommentLessonTitle(comment: MyComment): string {
  const lesson = comment.lessons;
  if (!lesson) return "";
  return Array.isArray(lesson) ? (lesson[0]?.title ?? "") : lesson.title;
}

export function useMyComments() {
  return useQuery({
    queryKey: ["my-comments"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<MyComment[]>>("/api/comments/me");
      return data.data;
    },
    staleTime: 60 * 1000,
  });
}
