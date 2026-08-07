"use client";

import { useState } from "react";
import { StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useLessonNotes,
  useCreateLessonNote,
  useDeleteLessonNote,
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

export function NotesPanel({ lessonId }: { lessonId: string }) {
  const { data: notes, isLoading } = useLessonNotes(lessonId);
  const createNote = useCreateLessonNote(lessonId);
  const deleteNote = useDeleteLessonNote(lessonId);
  const [timestamp, setTimestamp] = useState("0:00");
  const [content, setContent] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const seconds = parseTimestamp(timestamp);
    if (seconds === null) {
      toast.error("الوقت لازم يكون بصيغة دقيقة:ثانية، مثال 2:30");
      return;
    }
    if (!content.trim()) return;

    createNote.mutate(
      { timestamp_seconds: seconds, content: content.trim() },
      {
        onSuccess: () => setContent(""),
        onError: () => toast.error("تعذر إضافة النوتة"),
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
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="اكتب نوتة..."
          className="flex-1"
        />
        <Button type="submit" disabled={createNote.isPending}>
          إضافة
        </Button>
      </form>

      {isLoading && <Skeleton className="h-16 w-full" />}

      {!isLoading && !notes?.length && (
        <p className="text-small text-muted-foreground">مفيش نوتات لسه على الدرس ده.</p>
      )}

      {!isLoading && !!notes?.length && (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <li key={note.id} className="flex items-start gap-2 rounded-lg border border-border p-3">
              <StickyNote className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <span className="text-caption font-semibold text-muted-foreground">
                  {formatTimestamp(note.timestamp_seconds)}
                </span>
                <p className="text-small">{note.content}</p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="حذف النوتة"
                onClick={() => deleteNote.mutate(note.id)}
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
