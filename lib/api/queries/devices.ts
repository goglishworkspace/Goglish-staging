import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type Device = {
  id: string;
  user_agent: string | null;
  ip_address: string | null;
  is_active: boolean;
  last_active_at: string;
  created_at: string;
};

export function useDevices() {
  return useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Device[]>>("/api/auth/devices");
      return data.data;
    },
  });
}

export function useRemoveDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deviceId: string) => {
      await api.delete(`/api/auth/devices/${deviceId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["devices"] }),
  });
}
