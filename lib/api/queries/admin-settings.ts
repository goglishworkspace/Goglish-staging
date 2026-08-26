import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type PlatformSetting = { key: string; value: unknown; updated_at: string };

export function useAdminSettings() {
  return useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<PlatformSetting[]>>("/api/admin/settings");
      return data.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entries: Array<{ key: string; value: unknown }>) => {
      const { data } = await api.patch("/api/admin/settings", { entries });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-settings"] }),
  });
}
