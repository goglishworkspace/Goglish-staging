"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type VideoTimeContextType = {
  currentTime: number;
  setCurrentTime: (seconds: number) => void;
  seekTarget: number | null;
  seekTo: (seconds: number) => void;
};

const VideoTimeContext = createContext<VideoTimeContextType | null>(null);

/** Shares the video player's live playback position with sibling sections
 * (NotesPanel) and allows notes to jump/seek to specific timestamps directly. */
export function VideoTimeProvider({ children }: { children: ReactNode }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);

  const seekTo = (seconds: number) => {
    setSeekTarget(seconds);
  };

  return (
    <VideoTimeContext.Provider
      value={{
        currentTime,
        setCurrentTime,
        seekTarget,
        seekTo,
      }}
    >
      {children}
    </VideoTimeContext.Provider>
  );
}

export function useVideoTime() {
  const ctx = useContext(VideoTimeContext);
  return (
    ctx ?? {
      currentTime: 0,
      setCurrentTime: () => {},
      seekTarget: null,
      seekTo: () => {},
    }
  );
}
