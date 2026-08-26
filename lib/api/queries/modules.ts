import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type CourseModule = {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  deletion_requested_at?: string | null;
};

export type Lesson = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_preview: boolean;
  status: string;
  submitted_at?: string | null;
  rejection_reason?: string | null;
  deletion_requested_at?: string | null;
};

export function useCourseModules(courseId: string) {
  return useQuery({
    queryKey: ["course-modules", courseId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<CourseModule[]>>(`/api/courses/${courseId}/modules`);
      return data.data.sort((a, b) => a.order_index - b.order_index);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!courseId,
  });
}

export function useModuleLessons(moduleId: string) {
  return useQuery({
    queryKey: ["module-lessons", moduleId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Lesson[]>>(`/api/modules/${moduleId}/lessons`);
      return data.data.sort((a, b) => a.order_index - b.order_index);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!moduleId,
  });
}

export function useCreateModule(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; order_index: number }) => {
      const { data } = await api.post<ApiSuccess<CourseModule>>(`/api/courses/${courseId}/modules`, input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["course-modules", courseId] }),
  });
}

export function useUpdateModule(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ moduleId, title }: { moduleId: string; title: string }) => {
      const { data } = await api.patch<ApiSuccess<CourseModule>>(`/api/modules/${moduleId}`, { title });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["course-modules", courseId] }),
  });
}

export function useCreateLesson(moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description?: string; order_index: number }) => {
      const { data } = await api.post<ApiSuccess<Lesson>>(`/api/modules/${moduleId}/lessons`, input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["module-lessons", moduleId] }),
  });
}

export function useUpdateLesson(moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      lessonId,
      input,
    }: {
      lessonId: string;
      input: {
        title?: string;
        description?: string;
        is_preview?: boolean;
        youtube_preview_video_id?: string;
        youtube_video_id?: string;
      };
    }) => {
      const { data } = await api.patch<ApiSuccess<Lesson>>(`/api/lessons/${lessonId}`, input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["module-lessons", moduleId] }),
  });
}

export function useSubmitLessonForReview(moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lessonId: string) => {
      const { data } = await api.post(`/api/lessons/${lessonId}/submit`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["module-lessons", moduleId] }),
  });
}

export function useRequestModuleDeletion(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (moduleId: string) => {
      const { data } = await api.post<ApiSuccess<CourseModule>>(`/api/modules/${moduleId}/request-deletion`);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["course-modules", courseId] }),
  });
}

export function useRequestLessonDeletion(moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lessonId: string) => {
      const { data } = await api.post<ApiSuccess<Lesson>>(`/api/lessons/${lessonId}/request-deletion`);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["module-lessons", moduleId] }),
  });
}
