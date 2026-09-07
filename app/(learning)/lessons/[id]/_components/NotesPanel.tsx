"use client";

import { useState } from "react";
import {
  StickyNote,
  Trash2,
  Clock,
  Sparkles,
  Play,
  Copy,
  Check,
  Lightbulb,
  BookmarkPlus,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useVideoTime } from "./VideoTimeContext";
import {
  useLessonNotes,
  useCreateLessonNote,
  useDeleteLessonNote,
} from "@/lib/api/queries/lesson-notes";

function formatTimestamp(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const QUICK_TAGS = [
  { label: "📌 فكرة مهمة", text: "📌 فكرة مهمة: " },
  { label: "⚡ قانون / معادلة", text: "⚡ قانون / معادلة: " },
  { label: "❓ سؤال للمدرس", text: "❓ سؤال للمدرس: " },
  { label: "🎯 تكة امتحان", text: "🎯 تكة امتحان: " },
];

export function NotesPanel({ lessonId }: { lessonId: string }) {
  const { data: notes, isLoading } = useLessonNotes(lessonId);
  const createNote = useCreateLessonNote(lessonId);
  const deleteNote = useDeleteLessonNote(lessonId);
  const { currentTime, seekTo } = useVideoTime();
  const [content, setContent] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const currentSeconds = Math.floor(currentTime);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    createNote.mutate(
      { timestamp_seconds: currentSeconds, content: content.trim() },
      {
        onSuccess: () => {
          setContent("");
          toast.success("تم حفظ الملاحظة بنجاح");
        },
        onError: () => toast.error("تعذر إضافة الملاحظة"),
      },
    );
  };

  const handleCopyNote = (id: string, text: string, time: number) => {
    const formatted = `[${formatTimestamp(time)}] ${text}`;
    navigator.clipboard.writeText(formatted).then(() => {
      setCopiedId(id);
      toast.success("تم نسخ الملاحظة إلى الحافظة");
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleInsertTag = (tagText: string) => {
    if (!content.includes(tagText)) {
      setContent((prev) => tagText + prev);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Educational Purpose Guide Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card/80 to-amber-500/10 p-4 sm:p-5 backdrop-blur-md shadow-lg">
        <div className="flex items-start gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary shadow-inner">
            <Lightbulb className="size-5" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-foreground">
                المفكرة الذكية للدرس (Smart Study Notes)
              </h4>
              <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
                مبنية علمياً للمراجعة
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              تدوين الملاحظات أثناء الشرح يرفع معدل تثبيت المعلومة بنسبة تفوق 70%. كل ملاحظة تكتبها يتم ربطها تلقائياً
              بالدقيقة والثانية الحالية في الفيديو، لتتمكن من القفز إليها مباشرة بضغطة زر واحدة ليلة الامتحان دون الحاجة
              لإعادة مشاهدة الفيديو كاملاً.
            </p>
          </div>
        </div>
      </div>

      {/* Note Creation Card */}
      <div className="rounded-2xl border border-border/70 bg-card/80 p-4 sm:p-5 backdrop-blur-md shadow-md">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          {/* Top Bar with Live Timestamp */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-bold text-primary shadow-inner tabular-nums">
                <Clock className="size-3.5 animate-pulse" />
                <span>توقيت الملاحظة: {formatTimestamp(currentSeconds)}</span>
              </span>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                (يتم التقاط توقيت الفيديو لحظياً)
              </span>
            </div>

            {/* Quick Tag Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag.label}
                  type="button"
                  onClick={() => handleInsertTag(tag.text)}
                  className="rounded-lg border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all"
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="سجّل ملاحظتك، ملخص الفكرة، أو قانون ذكره المدرس في هذه اللحظة..."
            rows={2}
            className="rounded-xl border-border/70 bg-background/60 text-xs sm:text-sm leading-relaxed placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
          />

          {/* Submit CTA */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="size-3 text-amber-500" />
              اضغط على التوقيت لاحقاً للرجوع لنفس النقطة بالفيديو
            </span>

            <Button
              type="submit"
              disabled={createNote.isPending || !content.trim()}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 disabled:opacity-50"
            >
              <BookmarkPlus className="size-4" />
              <span>حفظ الملاحظة ({formatTimestamp(currentSeconds)})</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Notes Feed */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <StickyNote className="size-4 text-primary" />
            <span>ملاحظاتك المسجلة على الدرس</span>
            {!!notes?.length && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
                {notes.length}
              </span>
            )}
          </h4>
        </div>

        {isLoading && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        )}

        {!isLoading && !notes?.length && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-card/40 p-8 text-center backdrop-blur-sm">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-muted/40 text-muted-foreground">
              <HelpCircle className="size-6" />
            </div>
            <div className="flex flex-col gap-1 max-w-sm">
              <p className="text-xs font-bold text-foreground">لم تدون أي ملاحظات بعد على هذا الدرس</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                استغل ميزة التدوين الذكي أثناء الشرح لتوفر على نفسك ساعات المراجعة الطويلة قبل الامتحانات.
              </p>
            </div>
          </div>
        )}

        {!isLoading && !!notes?.length && (
          <ul className="flex flex-col gap-3">
            {notes.map((note) => (
              <li
                key={note.id}
                className="group relative flex flex-col sm:flex-row sm:items-start justify-between gap-3 rounded-2xl border border-border/70 bg-card/75 p-4 backdrop-blur-md shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Clickable Seek Button */}
                  <button
                    type="button"
                    onClick={() => {
                      seekTo(note.timestamp_seconds);
                      toast.info(`تم الانتقال إلى الدقيقة ${formatTimestamp(note.timestamp_seconds)}`);
                    }}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground active:scale-95 shadow-sm"
                    title="اضغط للقفز إلى هذا التوقيت في الفيديو"
                  >
                    <Play className="size-3 fill-current" />
                    <span className="tabular-nums">{formatTimestamp(note.timestamp_seconds)}</span>
                  </button>

                  {/* Note Content */}
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(note.created_at).toLocaleDateString("ar-EG", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions: Copy & Delete */}
                <div className="flex items-center self-end sm:self-start gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                    title="نسخ الملاحظة"
                    onClick={() => handleCopyNote(note.id, note.content, note.timestamp_seconds)}
                  >
                    {copiedId === note.id ? (
                      <Check className="size-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                    title="حذف الملاحظة"
                    disabled={deleteNote.isPending}
                    onClick={() => {
                      deleteNote.mutate(note.id, {
                        onSuccess: () => toast.success("تم حذف الملاحظة"),
                        onError: () => toast.error("تعذر حذف الملاحظة"),
                      });
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
