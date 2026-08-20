"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLessonProgress, useSaveLessonProgress } from "@/lib/api/queries/lesson-progress";
import { useVideoTime } from "./VideoTimeContext";

const SAVE_INTERVAL_MS = 20_000;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** currentTime here is the real YouTube playhead position (VideoTimeContext,
 * fed by YouTubePlayer's onTimeUpdate - the same value NotesPanel anchors
 * notes to), not a "how long has this tab been open" counter like this
 * component used before. That distinction matters: the old counter kept
 * ticking for every second a background tab stayed open regardless of
 * whether the video was actually playing, so it could drift arbitrarily far
 * past the video's real length (a lesson under 34 minutes long once showed
 * "last watched at 593:00"). Reading the real playhead instead means the
 * saved/displayed position can never exceed how long the video actually is. */
export function ProgressTracker({ lessonId }: { lessonId: string }) {
  const { data: progress } = useLessonProgress(lessonId);
  const saveProgress = useSaveLessonProgress(lessonId);
  const { currentTime } = useVideoTime();
  const currentTimeRef = useRef(currentTime);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentTimeRef.current > 0) {
        saveProgress.mutate({ progress_seconds: Math.round(currentTimeRef.current) });
      }
    }, SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fixed-interval saver, reads the latest position via currentTimeRef
  }, []);

  const onMarkComplete = () => {
    const seconds = currentTime > 0 ? currentTime : (progress?.progress_seconds ?? 0);
    saveProgress.mutate(
      { progress_seconds: Math.round(seconds), status: "completed" },
      {
        onSuccess: () => toast.success("تم تسجيل إنهاء الدرس"),
        onError: () => toast.error("تعذر تسجيل إنهاء الدرس"),
      },
    );
  };

  const isCompleted = progress?.status === "completed";
  // Once playback actually starts this session, the live position takes
  // over from whatever was saved last time (which is only ever shown before
  // the student presses play again).
  const displaySeconds = currentTime > 0 ? currentTime : (progress?.progress_seconds ?? 0);

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 px-4 py-3">
      <p className="text-small text-muted-foreground">
        {displaySeconds > 0 ? `آخر مشاهدة عند ${formatTime(displaySeconds)}` : "أول مرة تفتح الدرس ده"}
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
