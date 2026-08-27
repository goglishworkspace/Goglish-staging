import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type AdminUserSummary = {
  id: string;
  user_code: number | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  grade: string | null;
  admin_notes: string | null;
  deleted_at: string | null;
  banned: boolean;
  comment_banned: boolean;
  roles: string[];
  is_teacher: boolean;
  teacher_status: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

export type AdminUserDevice = {
  id: string;
  device_fingerprint: string;
  user_agent: string | null;
  ip_address: string | null;
  is_active: boolean;
  last_active_at: string;
  created_at: string;
};

export type AdminUserLoginEvent = {
  id: string;
  created_at: string;
  ip: string | null;
  user_agent: string | null;
};

export type AdminUserCourse = {
  course_id: string;
  title: string;
  source: string;
  granted_at: string;
};

export type AdminUserDetail = AdminUserSummary & {
  devices: AdminUserDevice[];
  login_history: AdminUserLoginEvent[];
  courses: AdminUserCourse[];
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

export function useAdminUserDetail(userId: string | null) {
  return useQuery({
    queryKey: ["admin-user-detail", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await api.get<ApiSuccess<AdminUserDetail>>(`/api/admin/users/${userId}`);
      return data.data;
    },
    enabled: !!userId,
  });
}

function useAdminUserMutation<TInput = void>(fn: (id: string, input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: TInput }) => fn(id, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", id] });
    },
  });
}

export function useAdminUpdateUserProfile() {
  return useAdminUserMutation<{
    first_name?: string;
    last_name?: string;
    phone?: string;
    grade?: string | null;
    admin_notes?: string;
    password?: string;
  }>((id, input) => api.patch(`/api/admin/users/${id}`, input));
}

export function useAdminKickDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, deviceId }: { userId: string; deviceId: string }) => {
      const { data } = await api.delete(`/api/admin/users/${userId}/devices/${deviceId}`);
      return data;
    },
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", userId] });
    },
  });
}

export function useAdminGrantCourseAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, courseId }: { userId: string; courseId: string }) => {
      const { data } = await api.post(`/api/admin/users/${userId}/courses`, { course_id: courseId });
      return data;
    },
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", userId] });
    },
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
