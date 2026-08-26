"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DatabaseBackup, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useExportBackup, type BackupExportResult } from "@/lib/api/queries/admin-backup";

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

export default function AdminBackupsPage() {
  const exportBackup = useExportBackup();
  const [lastExport, setLastExport] = useState<BackupExportResult | null>(null);

  const onExport = () => {
    exportBackup.mutate(undefined, {
      onSuccess: (result) => {
        setLastExport(result);
        toast.success("تم تصدير النسخة الاحتياطية");
      },
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر تصدير النسخة الاحتياطية")),
    });
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-h2 text-secondary dark:text-white">النسخ الاحتياطي</h1>

      <Card className="w-full">
        <CardContent className="flex flex-col items-start gap-4 p-6">
          <div className="flex items-center gap-3">
            <DatabaseBackup className="size-8 text-primary" />
            <div>
              <p className="font-semibold text-foreground">تصدير نسخة احتياطية جديدة</p>
              <p className="text-small text-muted-foreground">
                يتم تصدير البيانات الأساسية كملف JSON ورابط تحميل موقّت.
              </p>
            </div>
          </div>
          <Button disabled={exportBackup.isPending} onClick={onExport}>
            {exportBackup.isPending ? "جاري التصدير..." : "تصدير الآن"}
          </Button>

          {lastExport && (
            <div className="flex w-full items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
              <span className="min-w-0 truncate text-small text-foreground">{lastExport.filename}</span>
              <a
                href={lastExport.url}
                target="_blank"
                rel="noreferrer"
                className="flex shrink-0 items-center gap-1 text-small font-medium text-primary underline"
              >
                <Download className="size-3.5" />
                تحميل
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-small text-muted-foreground">
        استرجاع نسخة احتياطية غير متاح من لوحة التحكم حالياً لتجنب أي فقدان بيانات غير مقصود - تواصل مع الدعم الفني لو احتجت استرجاع.
      </p>
    </div>
  );
}
