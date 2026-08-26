"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuditLogs } from "@/lib/api/queries/admin-audit-logs";

export default function AdminAuditLogsPage() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAuditLogs(page, action ? { action } : undefined);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-h2 text-secondary dark:text-white">سجل النشاطات</h1>

      <div className="flex flex-col gap-1.5 sm:w-64">
        <Label htmlFor="action-filter">تصفية حسب نوع العملية</Label>
        <Input
          id="action-filter"
          placeholder="مثال: user.banned"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {isLoading && <Skeleton className="h-96 w-full rounded-xl" />}

      {!isLoading && !data?.logs.length && <p className="py-8 text-center text-small text-muted-foreground">مفيش نشاطات مسجلة.</p>}

      {!isLoading && !!data?.logs.length && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الوقت</TableHead>
                <TableHead>العملية</TableHead>
                <TableHead>الجدول المستهدف</TableHead>
                <TableHead>تفاصيل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground">{new Date(log.created_at).toLocaleString("ar-EG")}</TableCell>
                  <TableCell className="font-mono">{log.action}</TableCell>
                  <TableCell>{log.target_table ?? "-"}</TableCell>
                  <TableCell className="max-w-xs truncate text-caption text-muted-foreground">
                    {log.metadata ? JSON.stringify(log.metadata) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between gap-3">
            <p className="text-caption text-muted-foreground">
              صفحة {page} من {totalPages} - {data.total} عملية
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                السابق
              </Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                التالي
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
