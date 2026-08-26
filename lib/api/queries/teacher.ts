import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type TeacherProfileFields = {
  display_name: string;
  bio: string | null;
  photo_url: string | null;
  experience_years: number | null;
  rating_avg: number | null;
  rating_count: number | null;
};

export type MyTeacher = {
  id: string;
  status: string;
  created_at: string;
  teacher_profiles: TeacherProfileFields | TeacherProfileFields[] | null;
};

export function normalizeTeacherProfile(teacher: MyTeacher): TeacherProfileFields | null {
  const profile = teacher.teacher_profiles;
  return Array.isArray(profile) ? (profile[0] ?? null) : profile;
}

export function useMyTeacher() {
  return useQuery({
    queryKey: ["my-teacher"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<MyTeacher>>("/api/teachers/me");
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export type UpdateTeacherProfileInput = {
  display_name?: string;
  bio?: string;
  photo_url?: string;
  experience_years?: number;
};

export function useUpdateMyTeacherProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateTeacherProfileInput) => {
      const { data } = await api.patch<ApiSuccess<MyTeacher>>("/api/teachers/me", input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-teacher"] }),
  });
}

export type TeacherOwnReportCourse = {
  course_id: string;
  title: string;
  status: string;
  students_count: number;
  avg_completion_percent: number;
  avg_quiz_score_percent: number;
};

export type TeacherOwnReportMonthlyRevenue = { month: string; revenue_cents: number };

export type TeacherOwnReport = {
  display_name: string | null;
  rating_avg: number;
  rating_count: number;
  courses: TeacherOwnReportCourse[];
  total_revenue_cents: number;
  monthly_revenue: TeacherOwnReportMonthlyRevenue[];
};

export function useMyTeacherReport() {
  return useQuery({
    queryKey: ["my-teacher-report"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<TeacherOwnReport>>("/api/teachers/me/report");
      return data.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}
