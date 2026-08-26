import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type AdminDashboardStats = {
  students_count: number;
  teachers_count: number;
  courses_count: number;
  published_courses_count: number;
  active_subscriptions_count: number;
  pending_comments_count: number;
  pending_content_reviews_count: number;
  total_revenue_cents: number;
};

export function useAdminDashboardStats() {
  return useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<AdminDashboardStats>>("/api/admin/dashboard");
      return data.data;
    },
    staleTime: 60 * 1000,
  });
}
