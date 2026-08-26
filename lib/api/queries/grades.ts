import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type Grade = { id: string; name: string; slug: string; order_index: number };

export function useGrades() {
  return useQuery({
    queryKey: ["grades"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Grade[]>>("/api/grades");
      return data.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}
