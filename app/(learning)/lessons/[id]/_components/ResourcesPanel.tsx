"use client";

import { FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLessonResources, useResourceSignedUrl } from "@/lib/api/queries/lesson-resources";

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
}

export function ResourcesPanel({ lessonId }: { lessonId: string }) {
  const { data: resources, isLoading } = useLessonResources(lessonId);
  const getSignedUrl = useResourceSignedUrl(lessonId);

  const onDownload = (resourceId: string) => {
    getSignedUrl.mutate(resourceId, {
      onSuccess: (data) => {
        if (data) window.open(data.url, "_blank", "noopener,noreferrer");
      },
      onError: () => toast.error("تعذر توليد رابط التحميل"),
    });
  };

  if (isLoading) return <Skeleton className="h-16 w-full" />;
  if (!resources?.length) {
    return <p className="text-small text-muted-foreground">مفيش ملفات مرفوعة على الدرس ده.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {resources.map((r) => (
        <li key={r.id} className="flex items-center gap-2 rounded-lg border border-border p-3">
          <FileText className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate text-small">{r.title}</span>
          <span className="shrink-0 text-caption text-muted-foreground">{formatFileSize(r.file_size_bytes)}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="تحميل الملف"
            disabled={getSignedUrl.isPending}
            onClick={() => onDownload(r.id)}
          >
            <Download className="size-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
