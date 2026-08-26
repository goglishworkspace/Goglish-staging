import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type LinkedChild = {
  student_id: string;
  first_name: string;
  last_name: string;
  status: "pending" | "approved" | "rejected";
};

export function useLinkedChildren() {
  return useQuery({
    queryKey: ["parent-children"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<LinkedChild[]>>("/api/parent/children");
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useLinkChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (identifier: string) => {
      const payload =
        /^01\d{9}$/.test(identifier) || (/^\d{10,15}$/.test(identifier) && !/^\d{14}$/.test(identifier))
          ? { phone: identifier }
          : { national_id: identifier };
      const { data } = await api.post<ApiSuccess<{ student_id: string; status: "pending" | "approved" }>>(
        "/api/parent/children",
        payload,
      );
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["parent-children"] }),
  });
}

export const useLinkChildByNationalId = useLinkChild;

type QuizResultRow = {
  id: string;
  score_percent: number;
  passed: boolean;
  submitted_at: string;
  quizzes: { title: string } | { title: string }[] | null;
};

export function getQuizResultTitle(row: QuizResultRow): string {
  const q = row.quizzes;
  if (!q) return "";
  return Array.isArray(q) ? (q[0]?.title ?? "") : q.title;
}

export type ChildOverview = {
  student: { first_name?: string; last_name?: string };
  last_login_at: string | null;
  courses: Array<{
    course_id: string;
    course_title: string;
    total_lessons: number;
    completed_lessons: number;
    completion_percent: number;
    watch_time_seconds: number;
  }>;
  gamification: {
    xp_total: number;
    coins_total: number;
    current_streak_days: number;
    level: { level_number: number; min_xp: number; title: string } | null;
    global_rank: number | null;
  };
  quiz_results: QuizResultRow[];
  exam_results: Array<{
    id: string;
    score_percent: number;
    passed: boolean;
    submitted_at: string;
    exams: { title: string } | { title: string }[] | null;
  }>;
  subscription: {
    status: string;
    current_period_end: string;
    subscription_plans: { name: string; kind: string } | { name: string; kind: string }[] | null;
  } | null;
  upcoming_exams: Array<{ id: string; title: string; course_id: string }>;
};

export function useChildOverview(studentId: string) {
  return useQuery({
    queryKey: ["child-overview", studentId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<ChildOverview>>(`/api/parent/children/${studentId}/overview`);
      return data.data;
    },
    staleTime: 60 * 1000,
    enabled: !!studentId,
  });
}

export type ChildNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export function useChildNotifications(studentId: string) {
  return useQuery({
    queryKey: ["child-notifications", studentId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<ChildNotification[]>>(`/api/parent/children/${studentId}/notifications`);
      return data.data;
    },
    staleTime: 60 * 1000,
    enabled: !!studentId,
  });
}
