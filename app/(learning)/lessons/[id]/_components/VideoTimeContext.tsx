"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const VideoTimeContext = createContext<{ currentTime: number; setCurrentTime: (seconds: number) => void } | null>(
  null,
);

/** Shares the video player's live playback position with sibling sections
 * further down the page (NotesPanel) without threading it through every
 * server-rendered element in between - see YouTubePlayer's onTimeUpdate. */
export function VideoTimeProvider({ children }: { children: ReactNode }) {
  const [currentTime, setCurrentTime] = useState(0);
  return <VideoTimeContext.Provider value={{ currentTime, setCurrentTime }}>{children}</VideoTimeContext.Provider>;
}

export function useVideoTime() {
  const ctx = useContext(VideoTimeContext);
  // Outside a lesson page with a real video (e.g. no video uploaded yet),
  // there's no provider - fall back to a static 0 instead of throwing, so
  // NotesPanel doesn't need a separate "no video" variant.
  return ctx ?? { currentTime: 0, setCurrentTime: () => {} };
}
