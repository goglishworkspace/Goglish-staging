import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type Quiz = {
  id: string;
  lesson_id: string;
  kind: "quiz";
  title: string;
  status: string;
};

export type Exam = {
  id: string;
  course_id: string;
  title: string;
  status: string;
};

export function useLessonQuizzes(lessonId: string) {
  return useQuery({
    queryKey: ["lesson-quizzes", lessonId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Quiz[]>>("/api/quizzes", { params: { lesson_id: lessonId } });
      return data.data.filter((q) => q.status === "published");
    },
    enabled: !!lessonId,
  });
}

export function useCourseExams(courseId: string) {
  return useQuery({
    queryKey: ["course-exams", courseId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Exam[]>>("/api/exams", { params: { course_id: courseId } });
      return data.data.filter((e) => e.status === "published");
    },
    enabled: !!courseId,
  });
}
