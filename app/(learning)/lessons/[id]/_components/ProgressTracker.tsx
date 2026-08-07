"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLessonProgress, useSaveLessonProgress } from "@/lib/api/queries/lesson-progress";

const SAVE_INTERVAL_MS = 20_000;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Bunny/YouTube play through a cross-origin <iframe>, so the real video
 * playhead isn't reachable from here without a provider-specific postMessage
 * SDK integration (out of scope for this pass). Instead this tracks elapsed
 * time the lesson page has stayed visible/open as an honest proxy for watch
 * time, autosaving periodically - same "progress_seconds" field the backend
 * already used as a generic counter, not a frame-accurate position. */
export function ProgressTracker({ lessonId }: { lessonId: string }) {
  const { data: progress } = useLessonProgress(lessonId);
  const saveProgress = useSaveLessonProgress(lessonId);
  const [elapsed, setElapsed] = useState(0);
  const baseRef = useRef(0);
  const savedOnceRef = useRef(false);

  useEffect(() => {
    if (progress) baseRef.current = progress.progress_seconds;
  }, [progress]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (elapsed > 0 && elapsed % (SAVE_INTERVAL_MS / 1000) === 0) {
      savedOnceRef.current = true;
      saveProgress.mutate({ progress_seconds: baseRef.current + elapsed });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on elapsed tick
  }, [elapsed]);

  const onMarkComplete = () => {
    saveProgress.mutate(
      { progress_seconds: baseRef.current + elapsed, status: "completed" },
      {
        onSuccess: () => toast.success("تم تسجيل إنهاء الدرس"),
        onError: () => toast.error("تعذر تسجيل إنهاء الدرس"),
      },
    );
  };

  const isCompleted = progress?.status === "completed";

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 px-4 py-3">
      <p className="text-small text-muted-foreground">
        {progress && progress.progress_seconds > 0
          ? `آخر مشاهدة عند ${formatTime(progress.progress_seconds)}`
          : "أول مرة تفتح الدرس ده"}
      </p>
      <Button
        size="sm"
        variant={isCompleted ? "secondary" : "default"}
        disabled={isCompleted}
        onClick={onMarkComplete}
      >
        <CheckCircle2 />
        {isCompleted ? "تم إنهاء الدرس" : "علّم الدرس كمكتمل"}
      </Button>
    </div>
  );
}
