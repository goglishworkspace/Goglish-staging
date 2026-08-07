import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type LessonProgress = {
  progress_seconds: number;
  status: "in_progress" | "completed";
  last_watched_at: string;
} | null;

export function useLessonProgress(lessonId: string) {
  return useQuery({
    queryKey: ["lesson-progress", lessonId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<LessonProgress>>(`/api/lessons/${lessonId}/progress`);
      return data.data;
    },
    staleTime: 30 * 1000,
    enabled: !!lessonId,
  });
}

export type CourseProgressSummary = {
  total_lessons: number;
  completed_lessons: number;
  percent: number;
  completed_lesson_ids: string[];
};

export function useCourseProgress(courseId: string) {
  return useQuery({
    queryKey: ["course-progress", courseId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<CourseProgressSummary>>(`/api/courses/${courseId}/progress`);
      return data.data;
    },
    staleTime: 30 * 1000,
    enabled: !!courseId,
  });
}

export function useSaveLessonProgress(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { progress_seconds: number; status?: "in_progress" | "completed" }) => {
      const { data } = await api.post(`/api/lessons/${lessonId}/progress`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-progress", lessonId] });
      queryClient.invalidateQueries({ queryKey: ["course-progress"] });
    },
  });
}
