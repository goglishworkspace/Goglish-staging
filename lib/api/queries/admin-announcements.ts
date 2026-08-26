import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type AnnouncementTarget = "all" | "grade";
export type AnnouncementGrade = "grade1" | "grade2" | "grade3";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  target: AnnouncementTarget;
  target_grade: AnnouncementGrade | null;
  expires_at: string | null;
  created_at: string;
};

export function useAnnouncements() {
  return useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Announcement[]>>("/api/announcements");
      return data.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      body: string;
      target: AnnouncementTarget;
      target_grade?: AnnouncementGrade;
      expires_at?: string;
    }) => {
      const { data } = await api.post("/api/announcements", input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-announcements"] }),
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/api/announcements/${id}`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-announcements"] }),
  });
}
