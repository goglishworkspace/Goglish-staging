"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserManageDialog } from "@/components/admin/UserManageDialog";
import { useAdminUsers, type AdminUserSummary } from "@/lib/api/queries/admin-users";
import { useProfile } from "@/lib/api/queries/profile";

function formatDateTimeEn(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selected, setSelected] = useState<AdminUserSummary | null>(null);
  const { data: profile } = useProfile();

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data: users, isLoading } = useAdminUsers(debounced || undefined);
  const viewerIsSuperAdmin = !!users?.find((u) => u.id === profile?.id)?.roles.includes("super_admin");

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((user) => {
      if (selectedRole !== "all") {
        if (selectedRole === "admin_group") {
          if (!user.roles.includes("admin") && !user.roles.includes("super_admin")) return false;
        } else if (!user.roles.includes(selectedRole)) {
          return false;
        }
      }

      if (selectedStatus !== "all") {
        if (selectedStatus === "banned" && !user.banned) return false;
        if (selectedStatus === "deleted" && !user.deleted_at) return false;
        if (selectedStatus === "active" && (user.banned || user.deleted_at)) return false;
      }

      return true;
    });
  }, [users, selectedRole, selectedStatus]);

  const exportCsv = () => {
    if (!filteredUsers || filteredUsers.length === 0) return;

    const headers = [
      "كود المستخدم",
      "الاسم",
      "الإيميل",
      "رقم التليفون",
      "الصف الدراسي",
      "الأدوار",
      "الحالة",
      "آخر تسجيل دخول",
      "تاريخ الإنشاء",
    ];

    const rows = filteredUsers.map((u) => [
      u.user_code ? `GOG-${u.user_code}` : "-",
      `"${(u.first_name ?? "") + " " + (u.last_name ?? "")}"`,
      u.email,
      `"${u.phone ?? "-"}"`,
      u.grade ?? "-",
      `"${u.roles.join(", ")}"`,
      u.deleted_at ? "محذوف" : u.banned ? "محظور" : "نشط",
      u.last_sign_in_at ? formatDateTimeEn(u.last_sign_in_at) : "-",
      formatDateTimeEn(u.created_at),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `goglish_users_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 text-secondary dark:text-white">إدارة المستخدمين</h1>
          <p className="text-small text-muted-foreground mt-1">
            إجمالي المستخدمين: <span className="font-bold text-foreground">{users?.length ?? 0}</span>
          </p>
        </div>

        <Button onClick={exportCsv} variant="outline" className="gap-2" disabled={!filteredUsers.length}>
          <Download className="size-4" />
          تصدير إلى Excel / CSV
        </Button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم، الإيميل، رقم التليفون، أو كود الطالب (GOG-1001)..."
            className="ps-9"
          />
        </div>

        <div className="w-44">
          <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val as string)}>
            <SelectTrigger>
              <SelectValue placeholder="فلترة بالدور" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأدوار</SelectItem>
              <SelectItem value="student">الطلاب فقط</SelectItem>
              <SelectItem value="teacher">المدرسين فقط</SelectItem>
              <SelectItem value="parent">أولياء الأمور</SelectItem>
              <SelectItem value="admin_group">الإدارة والأدمن</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val as string)}>
            <SelectTrigger>
              <SelectValue placeholder="فلترة بالحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="active">النشطين فقط</SelectItem>
              <SelectItem value="banned">المحظورين</SelectItem>
              <SelectItem value="deleted">المحذوفين</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && <Skeleton className="h-96 w-full rounded-xl" />}

      {!isLoading && !filteredUsers.length && (
        <p className="py-8 text-center text-small text-muted-foreground">لا يوجد مستخدمين مطابقين للبحث أو الفلتر.</p>
      )}

      {!isLoading && !!filteredUsers.length && (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>كود الطالب</TableHead>
                <TableHead>الاسم</TableHead>
                <TableHead>الإيميل</TableHead>
                <TableHead>رقم التليفون</TableHead>
                <TableHead>الأدوار</TableHead>
                <TableHead>آخر تسجيل دخول</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    {user.user_code ? (
                      <Badge variant="outline" className="font-mono text-primary border-primary">
                        #GOG-{user.user_code}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-caption font-mono">
                        #{user.id.slice(0, 6)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {user.first_name || user.last_name
                      ? `${user.first_name ?? ""} ${user.last_name ?? ""}`
                      : "بدون اسم"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-small">{user.email}</TableCell>
                  <TableCell dir="ltr" className="text-end text-muted-foreground text-small">
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
                  <TableCell dir="ltr" className="text-small text-muted-foreground text-start">
                    {user.last_sign_in_at ? (
                      formatDateTimeEn(user.last_sign_in_at)
                    ) : (
                      <span className="text-muted-foreground/60">لم يسجل بعد</span>
                    )}
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
                      إدارة وتحكم
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
