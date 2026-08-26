"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Upload, Trash2, Pencil, Check, X, FileText, Music, Archive, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMediaFiles,
  useUploadMediaFile,
  useRenameMediaFile,
  useDeleteMediaFile,
  type MediaFile,
} from "@/lib/api/queries/admin-media";

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}

const FILE_ICON: Record<MediaFile["file_type"], React.ComponentType<{ className?: string }>> = {
  image: FileText,
  pdf: FileText,
  audio: Music,
  zip: Archive,
  other: FileQuestion,
};

function MediaCard({ file }: { file: MediaFile }) {
  const rename = useRenameMediaFile();
  const del = useDeleteMediaFile();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(file.original_filename);
  const Icon = FILE_ICON[file.file_type];

  const onRename = () => {
    if (!name.trim()) return;
    rename.mutate(
      { id: file.id, original_filename: name.trim() },
      {
        onSuccess: () => {
          toast.success("تم تغيير اسم الملف");
          setEditing(false);
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر تغيير اسم الملف")),
      },
    );
  };

  const onDelete = () => {
    del.mutate(file.id, {
      onSuccess: () => toast.success("تم حذف الملف"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر حذف الملف")),
    });
  };

  return (
    <Card className="w-full overflow-hidden">
      {file.file_type === "image" && file.url ? (
        <div className="relative h-32 w-full">
          <Image src={file.url} alt={file.original_filename} fill sizes="20vw" className="object-cover" />
        </div>
      ) : (
        <div className="flex h-32 w-full items-center justify-center bg-muted">
          <Icon className="size-8 text-muted-foreground" />
        </div>
      )}
      <CardContent className="flex flex-col gap-2 p-3">
        {editing ? (
          <div className="flex items-center gap-1">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
            <Button size="icon-sm" variant="ghost" disabled={rename.isPending} onClick={onRename}>
              <Check className="size-3.5" />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={() => setEditing(false)}>
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <p className="truncate text-small font-medium text-foreground">{file.original_filename}</p>
        )}
        <p className="text-caption text-muted-foreground">{formatBytes(file.size_bytes)}</p>
        {!editing && (
          <div className="flex items-center gap-2">
            {file.url && (
              <a href={file.url} target="_blank" rel="noreferrer" className="text-caption text-primary underline">
                معاينة
              </a>
            )}
            <button type="button" onClick={() => setEditing(true)} className="ms-auto text-muted-foreground hover:text-foreground">
              <Pencil className="size-3.5" />
            </button>
            <button type="button" disabled={del.isPending} onClick={onDelete} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminMediaLibraryPage() {
  const { data: files, isLoading } = useMediaFiles();
  const upload = useUploadMediaFile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    upload.mutate(file, {
      onSuccess: () => toast.success("تم رفع الملف"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر رفع الملف")),
    });
  };

  const totalBytes = files?.reduce((sum, f) => sum + f.size_bytes, 0) ?? 0;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 text-secondary dark:text-white">مكتبة الوسائط</h1>
          {!!files?.length && (
            <p className="text-small text-muted-foreground">
              {files.length} ملف - {formatBytes(totalBytes)}
            </p>
          )}
        </div>
        <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelected} />
        <Button disabled={upload.isPending} onClick={() => fileInputRef.current?.click()}>
          <Upload />
          رفع ملف
        </Button>
      </div>

      {isLoading && (
        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && !files?.length && <p className="py-8 text-center text-small text-muted-foreground">مفيش ملفات في المكتبة.</p>}

      {!isLoading && !!files?.length && (
        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {files.map((file) => (
            <MediaCard key={file.id} file={file} />
          ))}
        </div>
      )}
    </div>
  );
}
