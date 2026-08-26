import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type AdminUserSummary = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  grade: string | null;
  deleted_at: string | null;
  banned: boolean;
  comment_banned: boolean;
  roles: string[];
  is_teacher: boolean;
  teacher_status: string | null;
  created_at: string;
};

export function useAdminUsers(q?: string) {
  return useQuery({
    queryKey: ["admin-users", q ?? ""],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<AdminUserSummary[]>>("/api/admin/users", {
        params: q ? { q } : undefined,
      });
      return data.data;
    },
    staleTime: 30 * 1000,
  });
}

function useAdminUserMutation<TInput = void>(fn: (id: string, input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: TInput }) => fn(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useBanUser() {
  return useAdminUserMutation<{ reason?: string } | undefined>((id, input) =>
    api.post(`/api/admin/users/${id}/ban`, input ?? {}),
  );
}

export function useUnbanUser() {
  return useAdminUserMutation((id) => api.delete(`/api/admin/users/${id}/ban`));
}

export function useResetUserPassword() {
  return useAdminUserMutation((id) => api.post(`/api/admin/users/${id}/reset-password`));
}

export function useResetUserDevices() {
  return useAdminUserMutation((id) => api.post(`/api/admin/users/${id}/reset-devices`));
}

export function useAssignRole() {
  return useAdminUserMutation<{
    role_name: string;
    teacher_display_name?: string;
    teacher_bio?: string;
    teacher_experience_years?: number;
  }>((id, input) => api.post(`/api/admin/users/${id}/roles`, input));
}

export function useRevokeRole() {
  return useAdminUserMutation<{ role_name: string }>((id, input) =>
    api.delete(`/api/admin/users/${id}/roles`, { params: { role_name: input.role_name } }),
  );
}

export function useSuspendTeacher() {
  return useAdminUserMutation<{ reason?: string } | undefined>((id, input) =>
    api.post(`/api/admin/users/${id}/suspend-teacher`, input ?? {}),
  );
}

export function useReactivateTeacher() {
  return useAdminUserMutation((id) => api.delete(`/api/admin/users/${id}/suspend-teacher`));
}

export function useSoftDeleteUser() {
  return useAdminUserMutation((id) => api.delete(`/api/admin/users/${id}`));
}

export function useRestoreUser() {
  return useAdminUserMutation((id) => api.post(`/api/admin/users/${id}/restore`));
}
