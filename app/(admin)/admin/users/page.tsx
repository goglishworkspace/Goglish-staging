"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserManageDialog } from "@/components/admin/UserManageDialog";
import { useAdminUsers, type AdminUserSummary } from "@/lib/api/queries/admin-users";
import { useProfile } from "@/lib/api/queries/profile";

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<AdminUserSummary | null>(null);
  const { data: profile } = useProfile();

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query), 400);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data: users, isLoading } = useAdminUsers(debounced || undefined);
  const viewerIsSuperAdmin = !!users?.find((u) => u.id === profile?.id)?.roles.includes("super_admin");

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-h2 text-secondary dark:text-white">إدارة المستخدمين</h1>

      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالاسم أو الإيميل..."
          className="ps-9"
        />
      </div>

      {isLoading && <Skeleton className="h-96 w-full rounded-xl" />}

      {!isLoading && !users?.length && (
        <p className="py-8 text-center text-small text-muted-foreground">مفيش مستخدمين مطابقين.</p>
      )}

      {!isLoading && !!users?.length && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>الإيميل</TableHead>
              <TableHead>رقم التليفون</TableHead>
              <TableHead>الأدوار</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.first_name} {user.last_name}
                </TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell dir="ltr" className="text-end text-muted-foreground">
                  {user.phone ?? "-"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <Badge key={role} variant="secondary" className="text-caption">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {user.deleted_at ? (
                    <Badge variant="destructive">محذوف</Badge>
                  ) : user.banned ? (
                    <Badge variant="destructive">محظور</Badge>
                  ) : (
                    <Badge variant="default">نشط</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => setSelected(user)}>
                    إدارة
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {selected && (
        <UserManageDialog
          user={selected}
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
          viewerIsSuperAdmin={viewerIsSuperAdmin}
        />
      )}
    </div>
  );
}
