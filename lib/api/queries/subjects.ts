import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type Subject = {
  id: string;
  name: string;
  slug: string;
  grade_id: string;
};

export type CreateSubjectInput = {
  grade_id: string;
  name: string;
  slug: string;
  primary_teacher_id?: string;
};

export function useSubjects(gradeId?: string) {
  return useQuery({
    queryKey: ["subjects", gradeId ?? "all"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Subject[]>>("/api/subjects", {
        params: gradeId ? { grade_id: gradeId } : undefined,
      });
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubject(id: string) {
  return useQuery({
    queryKey: ["subject", id],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Subject>>(`/api/subjects/${id}`);
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSubjectInput) => {
      const { data } = await api.post<ApiSuccess<Subject>>("/api/subjects", input);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (subjectId: string) => {
      const { data } = await api.delete(`/api/subjects/${subjectId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
}
