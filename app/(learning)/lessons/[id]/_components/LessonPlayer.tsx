"use client";

import Link from "next/link";
import { VideoDeterrents } from "./VideoDeterrents";
import { WatermarkOverlay } from "./WatermarkOverlay";
import { YouTubePlayer } from "@/components/shared/YouTubePlayer";
import type { LessonPlaybackResult } from "@/lib/services/lesson-playback.service";

export function LessonPlayer({ playback }: { playback: LessonPlaybackResult }) {
  if (playback.kind === "login_required") {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-black/90 text-center text-white">
        <p>لازم تسجل دخول لمشاهدة الدرس ده</p>
        <Link href="/login" className="font-semibold underline">
          سجّل دخول
        </Link>
      </div>
    );
  }

  if (playback.kind === "purchase_required") {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-black/90 text-center text-white">
        لازم تشتري الكورس ده الأول عشان تقدر تشاهد الدرس
      </div>
    );
  }

  if (playback.kind === "no_video" || playback.kind === "not_found") {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-black/90 text-white">
        مفيش فيديو متاح للدرس ده لسه
      </div>
    );
  }

  if (playback.kind === "youtube") {
    return (
      <VideoDeterrents>
        <YouTubePlayer videoId={playback.videoId} title="فيديو الدرس" />
      </VideoDeterrents>
    );
  }

  return (
    <VideoDeterrents>
      <div className="relative w-full">
        <YouTubePlayer videoId={playback.videoId} title="فيديو الدرس" />
        <WatermarkOverlay watermark={playback.watermark} />
      </div>
    </VideoDeterrents>
  );
}
