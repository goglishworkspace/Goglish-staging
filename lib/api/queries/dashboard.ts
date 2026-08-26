import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";
import type { StudentDashboard } from "@/lib/services/dashboard.service";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<StudentDashboard>>("/api/dashboard");
      return data.data;
    },
    staleTime: 60 * 1000,
  });
}
