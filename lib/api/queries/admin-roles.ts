import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type Role = {
  id: string;
  name: string;
  description: string | null;
  permission_role: { permissions: { name: string } | { name: string }[] | null }[];
};

export function getRolePermissionNames(role: Role): string[] {
  return role.permission_role
    .map((pr) => {
      const p = pr.permissions;
      return Array.isArray(p) ? p[0]?.name : p?.name;
    })
    .filter((name): name is string => !!name);
}

export function useRoles() {
  return useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Role[]>>("/api/admin/roles");
      return data.data;
    },
    staleTime: 60 * 1000,
  });
}

export type Permission = { id: string; name: string; description: string | null };

export function usePermissions() {
  return useQuery({
    queryKey: ["admin-permissions"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Permission[]>>("/api/admin/permissions");
      return data.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useAssignPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { roleId: string; permission_name: string }) => {
      const { data } = await api.post(`/api/admin/roles/${input.roleId}/permissions`, {
        permission_name: input.permission_name,
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-roles"] }),
  });
}

export function useRevokePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { roleId: string; permission_name: string }) => {
      const { data } = await api.delete(`/api/admin/roles/${input.roleId}/permissions`, {
        params: { permission_name: input.permission_name },
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-roles"] }),
  });
}
