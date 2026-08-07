import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";
import type { QuestionInput, Question } from "./question-types";

export type Quiz = {
  id: string;
  lesson_id: string;
  kind: "quiz";
  title: string;
  status: "draft" | "published";
};

export function useLessonQuizzes(lessonId: string) {
  return useQuery({
    queryKey: ["lesson-quizzes", lessonId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Quiz[]>>("/api/quizzes", { params: { lesson_id: lessonId } });
      return data.data;
    },
    staleTime: 60 * 1000,
    enabled: !!lessonId,
  });
}

export function useCreateQuiz(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string }) => {
      const { data } = await api.post<ApiSuccess<Quiz>>("/api/quizzes", { lesson_id: lessonId, ...input });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-quizzes", lessonId] }),
  });
}

export function useUpdateQuiz(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ quizId, title }: { quizId: string; title: string }) => {
      const { data } = await api.patch<ApiSuccess<Quiz>>(`/api/quizzes/${quizId}`, { title });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-quizzes", lessonId] }),
  });
}

export function usePublishQuiz(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (quizId: string) => {
      const { data } = await api.patch<ApiSuccess<Quiz>>(`/api/quizzes/${quizId}`, { status: "published" });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-quizzes", lessonId] }),
  });
}

export function useQuizQuestions(quizId: string) {
  return useQuery({
    queryKey: ["quiz-questions", quizId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Question[]>>(`/api/quizzes/${quizId}/questions`);
      return data.data;
    },
    staleTime: 60 * 1000,
    enabled: !!quizId,
  });
}

export function useCreateQuizQuestion(quizId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: QuestionInput) => {
      const { data } = await api.post<ApiSuccess<Question>>(`/api/quizzes/${quizId}/questions`, input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quiz-questions", quizId] }),
  });
}
