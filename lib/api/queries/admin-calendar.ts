import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type CalendarEventType = "lesson_release" | "quiz" | "exam" | "announcement";

export type CalendarEvent = {
  id: string;
  title: string;
  event_type: CalendarEventType;
  scheduled_at: string;
  target_table: "lessons" | "quizzes" | "exams" | null;
  target_id: string | null;
  auto_publish: boolean;
};

export function useCalendarEvents() {
  return useQuery({
    queryKey: ["admin-calendar"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<CalendarEvent[]>>("/api/admin/calendar");
      return data.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; event_type: CalendarEventType; scheduled_at: string }) => {
      const { data } = await api.post("/api/admin/calendar", input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-calendar"] }),
  });
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/api/admin/calendar/${id}`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-calendar"] }),
  });
}
