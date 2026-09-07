"use client";

import { FileText, FolderOpen, ArrowDownToLine } from "lucide-react";
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

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    );
  }

  if (!resources?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-card/40 p-8 text-center backdrop-blur-sm">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-muted/40 text-muted-foreground">
          <FolderOpen className="size-6" />
        </div>
        <div className="flex flex-col gap-1 max-w-sm">
          <p className="text-xs font-bold text-foreground">لا توجد ملفات أو ملخصات مرفوعة لهذا الدرس</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            سيقوم المعلم برفع المذكرات أو نماذج الأسئلة الخاصة بهذا الدرس هنا فور توفرها.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {resources.map((r) => (
        <li
          key={r.id}
          className="group flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/80 p-4 backdrop-blur-md shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
              <FileText className="size-5" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="truncate text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                {r.title}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                الحجم: {formatFileSize(r.file_size_bytes)}
              </span>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-1.5 rounded-xl border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all shrink-0"
            disabled={getSignedUrl.isPending}
            onClick={() => onDownload(r.id)}
          >
            <ArrowDownToLine className="size-3.5" />
            <span>تحميل</span>
          </Button>
        </li>
      ))}
    </ul>
  );
}
