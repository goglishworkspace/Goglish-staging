import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type LessonNote = {
  id: string;
  timestamp_seconds: number;
  content: string;
  created_at: string;
  updated_at: string;
};

export type LessonBookmark = {
  id: string;
  timestamp_seconds: number;
  label: string | null;
  created_at: string;
};

export function useLessonNotes(lessonId: string) {
  return useQuery({
    queryKey: ["lesson-notes", lessonId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<LessonNote[]>>(`/api/lessons/${lessonId}/notes`);
      return data.data;
    },
    enabled: !!lessonId,
  });
}

export function useCreateLessonNote(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { timestamp_seconds: number; content: string }) => {
      const { data } = await api.post<ApiSuccess<LessonNote>>(`/api/lessons/${lessonId}/notes`, input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-notes", lessonId] }),
  });
}

export function useDeleteLessonNote(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      await api.delete(`/api/lessons/${lessonId}/notes/${noteId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-notes", lessonId] }),
  });
}

export function useLessonBookmarks(lessonId: string) {
  return useQuery({
    queryKey: ["lesson-bookmarks", lessonId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<LessonBookmark[]>>(`/api/lessons/${lessonId}/bookmarks`);
      return data.data;
    },
    enabled: !!lessonId,
  });
}

export function useCreateLessonBookmark(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { timestamp_seconds: number; label?: string }) => {
      const { data } = await api.post<ApiSuccess<LessonBookmark>>(`/api/lessons/${lessonId}/bookmarks`, input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-bookmarks", lessonId] }),
  });
}

export function useDeleteLessonBookmark(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookmarkId: string) => {
      await api.delete(`/api/lessons/${lessonId}/bookmarks/${bookmarkId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-bookmarks", lessonId] }),
  });
}
