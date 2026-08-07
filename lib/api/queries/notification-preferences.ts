import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type NotificationPreferences = {
  in_app: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
  whatsapp: boolean;
};

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<NotificationPreferences>>("/api/notifications/preferences");
      return data.data;
    },
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Omit<NotificationPreferences, "in_app">>) => {
      const { data } = await api.patch<ApiSuccess<NotificationPreferences>>(
        "/api/notifications/preferences",
        input,
      );
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification-preferences"] }),
  });
}
