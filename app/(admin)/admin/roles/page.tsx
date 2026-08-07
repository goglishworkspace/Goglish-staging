"use client";

import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useRoles,
  usePermissions,
  useAssignPermission,
  useRevokePermission,
  getRolePermissionNames,
} from "@/lib/api/queries/admin-roles";

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

export default function AdminRolesPage() {
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const { data: permissions, isLoading: permsLoading } = usePermissions();
  const assignPermission = useAssignPermission();
  const revokePermission = useRevokePermission();

  const onToggle = (roleId: string, permissionName: string, currentlyGranted: boolean) => {
    const mutation = currentlyGranted ? revokePermission : assignPermission;
    mutation.mutate(
      { roleId, permission_name: permissionName },
      {
        onSuccess: () => toast.success(currentlyGranted ? "تم إلغاء الصلاحية" : "تم منح الصلاحية"),
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر تحديث الصلاحية")),
      },
    );
  };

  const isLoading = rolesLoading || permsLoading;

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-h2 text-secondary dark:text-white">الأدوار والصلاحيات</h1>

      {isLoading && <Skeleton className="h-96 w-full rounded-xl" />}

      {!isLoading && roles && permissions && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الصلاحية</TableHead>
              {roles.map((role) => (
                <TableHead key={role.id} className="text-center">
                  {role.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((permission) => (
              <TableRow key={permission.id}>
                <TableCell className="font-medium">{permission.name}</TableCell>
                {roles.map((role) => {
                  const granted = getRolePermissionNames(role).includes(permission.name);
                  return (
                    <TableCell key={role.id} className="text-center">
                      <input
                        type="checkbox"
                        checked={granted}
                        disabled={assignPermission.isPending || revokePermission.isPending}
                        onChange={() => onToggle(role.id, permission.name, granted)}
                        className="size-4 accent-primary"
                        aria-label={`${permission.name} - ${role.name}`}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
