import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type DeletionRequestEntityType = "module" | "lesson" | "quiz" | "exam" | "question" | "lesson_resource";

export type DeletionRequest = {
  entity_type: DeletionRequestEntityType;
  entity_id: string;
  label: string;
  context: string;
  requested_at: string;
  requested_by_name: string;
};

export function useDeletionRequests() {
  return useQuery({
    queryKey: ["admin-deletion-requests"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<DeletionRequest[]>>("/api/admin/deletion-requests");
      return data.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useReviewDeletionRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      entity_type: DeletionRequestEntityType;
      entity_id: string;
      decision: "approved" | "rejected";
    }) => {
      const { data } = await api.patch("/api/admin/deletion-requests", input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-deletion-requests"] }),
  });
}
