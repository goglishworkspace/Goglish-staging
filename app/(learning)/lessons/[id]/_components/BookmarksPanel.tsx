"use client";

import { useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useLessonBookmarks,
  useCreateLessonBookmark,
  useDeleteLessonBookmark,
} from "@/lib/api/queries/lesson-notes";

function parseTimestamp(value: string): number | null {
  const match = value.trim().match(/^(\d+):([0-5]?\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatTimestamp(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function BookmarksPanel({ lessonId }: { lessonId: string }) {
  const { data: bookmarks, isLoading } = useLessonBookmarks(lessonId);
  const createBookmark = useCreateLessonBookmark(lessonId);
  const deleteBookmark = useDeleteLessonBookmark(lessonId);
  const [timestamp, setTimestamp] = useState("0:00");
  const [label, setLabel] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const seconds = parseTimestamp(timestamp);
    if (seconds === null) {
      toast.error("الوقت لازم يكون بصيغة دقيقة:ثانية، مثال 2:30");
      return;
    }

    createBookmark.mutate(
      { timestamp_seconds: seconds, label: label.trim() || undefined },
      {
        onSuccess: () => setLabel(""),
        onError: () => toast.error("تعذر إضافة العلامة المرجعية"),
      },
    );
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <Input
          value={timestamp}
          onChange={(e) => setTimestamp(e.target.value)}
          placeholder="2:30"
          className="sm:w-24"
        />
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="عنوان (اختياري)"
          className="flex-1"
        />
        <Button type="submit" disabled={createBookmark.isPending}>
          إضافة
        </Button>
      </form>

      {isLoading && <Skeleton className="h-16 w-full" />}

      {!isLoading && !bookmarks?.length && (
        <p className="text-small text-muted-foreground">مفيش علامات مرجعية لسه على الدرس ده.</p>
      )}

      {!isLoading && !!bookmarks?.length && (
        <ul className="flex flex-col gap-2">
          {bookmarks.map((bookmark) => (
            <li
              key={bookmark.id}
              className="flex items-center gap-2 rounded-lg border border-border p-3"
            >
              <Bookmark className="size-4 shrink-0 text-primary" />
              <span className="text-caption font-semibold text-muted-foreground">
                {formatTimestamp(bookmark.timestamp_seconds)}
              </span>
              <span className="min-w-0 flex-1 truncate text-small">{bookmark.label}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="حذف العلامة المرجعية"
                onClick={() => deleteBookmark.mutate(bookmark.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
