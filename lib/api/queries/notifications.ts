import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

export function useNotifications(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Notification[]>>("/api/notifications");
      return data.data;
    },
    staleTime: 15 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await api.patch("/api/notifications", { notification_id: notificationId });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useRespondToParentLinkRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ linkId, status }: { linkId: string; status: "approved" | "rejected" }) => {
      const { data } = await api.patch(`/api/parent-links/${linkId}`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

const COMMENT_NOTIFICATION_TYPES = new Set(["lesson_comment_new", "lesson_comment_reply"]);

export function isCommentNotification(notification: Notification): boolean {
  return COMMENT_NOTIFICATION_TYPES.has(notification.type);
}

export function notificationHref(notification: Notification): string | null {
  if (isCommentNotification(notification)) {
    const lessonId = notification.metadata?.lesson_id;
    const commentId = notification.metadata?.comment_id;
    if (typeof lessonId !== "string" || typeof commentId !== "string") return null;
    return `/lessons/${lessonId}?comment=${commentId}`;
  }

  if (notification.type === "new_lesson") {
    const lessonId = notification.metadata?.lesson_id;
    return typeof lessonId === "string" ? `/lessons/${lessonId}` : null;
  }

  if (notification.type === "new_exam") {
    const examId = notification.metadata?.exam_id;
    return typeof examId === "string" ? `/exams/${examId}/attempt` : null;
  }

  if (notification.type === "new_course_in_bundle") {
    const bundleId = notification.metadata?.bundle_id;
    return typeof bundleId === "string" ? `/bundles/${bundleId}` : null;
  }

  return null;
}
