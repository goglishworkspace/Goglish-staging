"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, Eye, Award, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLessonProgress, useSaveLessonProgress } from "@/lib/api/queries/lesson-progress";
import { useVideoTime } from "./VideoTimeContext";

const SAVE_INTERVAL_MS = 60_000;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ProgressTracker({ lessonId }: { lessonId: string }) {
  const { data: progress } = useLessonProgress(lessonId);
  const saveProgress = useSaveLessonProgress(lessonId);
  const { currentTime } = useVideoTime();
  const currentTimeRef = useRef(currentTime);
  const lastSavedTimeRef = useRef<number>(0);
  const initialSyncedRef = useRef(false);

  useEffect(() => {
    if (!initialSyncedRef.current && progress?.progress_seconds) {
      lastSavedTimeRef.current = progress.progress_seconds;
      initialSyncedRef.current = true;
    }
  }, [progress?.progress_seconds]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    const interval = setInterval(() => {
      const current = currentTimeRef.current;
      if (current > 0 && Math.abs(current - lastSavedTimeRef.current) >= 15) {
        lastSavedTimeRef.current = current;
        saveProgress.mutate({ progress_seconds: Math.round(current) });
      }
    }, SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMarkComplete = () => {
    const seconds = currentTime > 0 ? currentTime : (progress?.progress_seconds ?? 0);
    saveProgress.mutate(
      { progress_seconds: Math.round(seconds), status: "completed" },
      {
        onSuccess: () => toast.success("أحسنت! تم تسجيل إتمام هذا الدرس وإضافة نقاط الخبرة"),
        onError: () => toast.error("تعذر تسجيل إنهاء الدرس"),
      },
    );
  };

  const isCompleted = progress?.status === "completed";
  const displaySeconds = currentTime > 0 ? currentTime : (progress?.progress_seconds ?? 0);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/85 p-3.5 sm:p-4 backdrop-blur-xl shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Playback Status Info */}
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Eye className="size-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">حالة المشاهدة</span>
              {isCompleted ? (
                <Badge className="border border-emerald-500/40 bg-emerald-500/15 text-emerald-500 text-[10px] font-semibold px-2 py-0.5">
                  <CheckCircle2 className="size-3 me-1" />
                  مكتمل
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-500 text-[10px] font-semibold px-2 py-0.5">
                  <Sparkles className="size-3 me-1" />
                  قيد التعلم
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {displaySeconds > 0
                ? `وصلت في المشاهدة إلى الدقيقة ${formatTime(displaySeconds)}`
                : "أول مرة تفتح هذا الدرس، نتمنى لك وقتاً مثمراً!"}
            </p>
          </div>
        </div>

        {/* Mark as Complete CTA */}
        <Button
          size="sm"
          disabled={isCompleted || saveProgress.isPending}
          onClick={onMarkComplete}
          className={
            isCompleted
              ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 font-bold rounded-xl text-xs h-9"
              : "bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 font-bold rounded-xl text-xs h-9 active:scale-95"
          }
        >
          {isCompleted ? (
            <>
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span>تم إنهاء الدرس بنجاح ✓</span>
            </>
          ) : (
            <>
              <Award className="size-4" />
              <span>تحديد الدرس كمكتمل ✓</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
