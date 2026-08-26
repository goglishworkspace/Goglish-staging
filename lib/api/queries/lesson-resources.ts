import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type LessonResource = {
  id: string;
  title: string;
  file_type: string;
  file_size_bytes: number;
  deletion_requested_at?: string | null;
  created_at: string;
};

export function useLessonResources(lessonId: string) {
  return useQuery({
    queryKey: ["lesson-resources", lessonId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<LessonResource[]>>(`/api/lessons/${lessonId}/resources`);
      return data.data;
    },
    enabled: !!lessonId,
  });
}

export function useUploadLessonResource(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, title }: { file: File; title: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      // Let the browser set Content-Type (with the multipart boundary) itself -
      // the axios instance's default "application/json" header must be
      // explicitly cleared here, not overridden with a boundary-less value.
      const { data } = await api.post<ApiSuccess<LessonResource>>(`/api/lessons/${lessonId}/resources`, formData, {
        headers: { "Content-Type": undefined },
      });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-resources", lessonId] }),
  });
}

export function useRequestResourceDeletion(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (resourceId: string) => {
      const { data } = await api.post<ApiSuccess<LessonResource>>(
        `/api/lessons/${lessonId}/resources/${resourceId}/request-deletion`,
      );
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-resources", lessonId] }),
  });
}

export function useResourceSignedUrl(lessonId: string) {
  return useMutation({
    mutationFn: async (resourceId: string) => {
      const { data } = await api.get<ApiSuccess<{ url: string; expiresIn: number }>>(
        `/api/lessons/${lessonId}/resources/${resourceId}/signed-url`,
      );
      return data.data;
    },
  });
}
