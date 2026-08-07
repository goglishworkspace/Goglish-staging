import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";
import type { QuestionInput, Question } from "./question-types";

export type Exam = {
  id: string;
  course_id: string;
  title: string;
  status: "draft" | "published";
};

export function useCourseExams(courseId: string) {
  return useQuery({
    queryKey: ["course-exams", courseId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Exam[]>>("/api/exams", { params: { course_id: courseId } });
      return data.data;
    },
    staleTime: 60 * 1000,
    enabled: !!courseId,
  });
}

export function useCreateExam(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string }) => {
      const { data } = await api.post<ApiSuccess<Exam>>("/api/exams", { course_id: courseId, ...input });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["course-exams", courseId] }),
  });
}

export function useUpdateExam(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ examId, title }: { examId: string; title: string }) => {
      const { data } = await api.patch<ApiSuccess<Exam>>(`/api/exams/${examId}`, { title });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["course-exams", courseId] }),
  });
}

export function usePublishExam(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (examId: string) => {
      const { data } = await api.patch<ApiSuccess<Exam>>(`/api/exams/${examId}`, { status: "published" });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["course-exams", courseId] }),
  });
}

export function useExamQuestions(examId: string) {
  return useQuery({
    queryKey: ["exam-questions", examId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Question[]>>(`/api/exams/${examId}/questions`);
      return data.data;
    },
    staleTime: 60 * 1000,
    enabled: !!examId,
  });
}

export function useCreateExamQuestion(examId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: QuestionInput) => {
      const { data } = await api.post<ApiSuccess<Question>>(`/api/exams/${examId}/questions`, input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["exam-questions", examId] }),
  });
}
