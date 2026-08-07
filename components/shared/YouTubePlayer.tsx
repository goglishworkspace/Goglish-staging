"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, RotateCw, Maximize, Minimize, Settings, Gauge, Volume2, Volume1, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

// YouTube's iframe embed has no parameter that hides only the Share button -
// controls=0 is the one lever that's actually guaranteed to remove every
// native control (including Share/"Watch on YouTube"), at the cost of losing
// YouTube's own play/pause/seek/speed/quality UI - which is why this
// component builds a full custom control bar via the IFrame Player API
// instead (skip ±10s, speed, quality, a real scrubber, fullscreen).
declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        options: {
          videoId: string;
          playerVars: Record<string, number>;
          events: {
            onReady: (event: { target: YouTubePlayerInstance }) => void;
            onStateChange: (event: { data: number }) => void;
          };
        },
      ) => YouTubePlayerInstance;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YouTubePlayerInstance = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setPlaybackRate: (rate: number) => void;
  getPlaybackRate: () => number;
  getAvailableQualityLevels: () => string[];
  setPlaybackQuality: (quality: string) => void;
  getPlaybackQuality: () => string;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  destroy: () => void;
};

const PLAYING_STATE = 1;
const SKIP_SECONDS = 10;
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const QUALITY_LABELS: Record<string, string> = {
  highres: "أعلى جودة",
  hd2160: "4K",
  hd1440: "1440p",
  hd1080: "1080p",
  hd720: "720p",
  large: "480p",
  medium: "360p",
  small: "240p",
  tiny: "144p",
  auto: "تلقائي",
};

let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
  return apiLoadPromise;
}

function formatTime(totalSeconds: number): string {
  if (!isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const minutesLabel = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  const secondsLabel = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${minutesLabel}:${secondsLabel}` : `${minutesLabel}:${secondsLabel}`;
}

export function YouTubePlayer({ videoId, title }: { videoId: string; title: string }) {
  // Two separate refs on purpose: the YouTube IFrame API replaces its mount
  // element in the DOM with an <iframe> (containerRef.current becomes a
  // detached node after that), so fullscreen must target a stable wrapper
  // element the API never touches, not containerRef itself.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState("auto");
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadYouTubeIframeApi().then(() => {
      if (cancelled || !containerRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: (event) => {
            setReady(true);
            setDuration(event.target.getDuration());
            setVolume(event.target.getVolume());
            setMuted(event.target.isMuted());
            // getAvailableQualityLevels() is reliably empty at onReady - YouTube
            // only knows the real quality ladder once playback actually starts
            // buffering, so this is re-checked on every state change too.
            setAvailableQualities(event.target.getAvailableQualityLevels());
          },
          onStateChange: (event) => {
            setPlaying(event.data === PLAYING_STATE);
            const player = playerRef.current;
            if (!player) return;
            const levels = player.getAvailableQualityLevels();
            if (levels.length > 0) setAvailableQualities(levels);
            setQuality(player.getPlaybackQuality());
          },
        },
      });
    });
    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  // The IFrame Player API has no "timeupdate" event - poll while playing.
  useEffect(() => {
    if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
    if (!playing) return;
    progressIntervalRef.current = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      setCurrentTime(player.getCurrentTime());
      setDuration(player.getDuration());
    }, 250);
    return () => {
      if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
    };
  }, [playing]);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === wrapperRef.current);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const togglePlay = () => {
    const player = playerRef.current;
    if (!player) return;
    if (playing) player.pauseVideo();
    else player.playVideo();
  };

  const skip = (deltaSeconds: number) => {
    const player = playerRef.current;
    if (!player) return;
    const target = Math.min(Math.max(0, player.getCurrentTime() + deltaSeconds), duration || Infinity);
    player.seekTo(target, true);
    setCurrentTime(target);
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const player = playerRef.current;
    if (!player) return;
    const time = Number(e.target.value);
    player.seekTo(time, true);
    setCurrentTime(time);
  };

  const changeSpeed = (newSpeed: number) => {
    playerRef.current?.setPlaybackRate(newSpeed);
    setSpeed(newSpeed);
    setShowSpeedMenu(false);
  };

  const onVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const player = playerRef.current;
    if (!player) return;
    const newVolume = Number(e.target.value);
    player.setVolume(newVolume);
    setVolume(newVolume);
    if (newVolume === 0) {
      player.mute();
      setMuted(true);
    } else if (muted) {
      player.unMute();
      setMuted(false);
    }
  };

  const toggleMute = () => {
    const player = playerRef.current;
    if (!player) return;
    if (muted) {
      player.unMute();
      setMuted(false);
    } else {
      player.mute();
      setMuted(true);
    }
  };

  const changeQuality = (newQuality: string) => {
    playerRef.current?.setPlaybackQuality(newQuality);
    setQuality(newQuality);
    setShowQualityMenu(false);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => console.error("exitFullscreen failed", err));
    } else {
      wrapperRef.current?.requestFullscreen().catch((err) => console.error("requestFullscreen failed", err));
    }
  };

  return (
    <div ref={wrapperRef} className="group relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-gradient-to-t from-black/85 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={onSeek}
          disabled={!ready}
          className="h-1 w-full cursor-pointer accent-primary"
          aria-label={`موضع الفيديو - ${title}`}
        />
        <div className="flex items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-3">
            <button type="button" onClick={togglePlay} disabled={!ready} aria-label={playing ? "إيقاف" : "تشغيل"}>
              {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
            </button>
            <button type="button" onClick={() => skip(-SKIP_SECONDS)} disabled={!ready} aria-label="رجوع 10 ثواني">
              <RotateCcw className="size-5" />
            </button>
            <button type="button" onClick={() => skip(SKIP_SECONDS)} disabled={!ready} aria-label="تقديم 10 ثواني">
              <RotateCw className="size-5" />
            </button>
            <span className="text-caption tabular-nums text-white/90">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                disabled={!ready}
                aria-label={muted || volume === 0 ? "إلغاء الكتم" : "كتم الصوت"}
              >
                {muted || volume === 0 ? (
                  <VolumeX className="size-5" />
                ) : volume < 50 ? (
                  <Volume1 className="size-5" />
                ) : (
                  <Volume2 className="size-5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={muted ? 0 : volume}
                onChange={onVolumeChange}
                disabled={!ready}
                className="h-1 w-16 cursor-pointer accent-primary"
                aria-label="مستوى الصوت"
              />
            </div>
          </div>

          <div className="relative flex items-center gap-3">
            {availableQualities.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowQualityMenu((v) => !v)}
                  className="flex items-center gap-1 text-caption text-white/90"
                  aria-label="جودة الفيديو"
                >
                  <Gauge className="size-4" />
                  {QUALITY_LABELS[quality] ?? quality}
                </button>
                {showQualityMenu && (
                  <div className="absolute bottom-full end-0 mb-2 flex flex-col overflow-hidden rounded-lg bg-black/90">
                    {availableQualities.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => changeQuality(option)}
                        className={cn(
                          "whitespace-nowrap px-4 py-1.5 text-caption hover:bg-white/10",
                          option === quality ? "text-primary" : "text-white/90",
                        )}
                      >
                        {QUALITY_LABELS[option] ?? option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSpeedMenu((v) => !v)}
                className="flex items-center gap-1 text-caption text-white/90"
                aria-label="سرعة التشغيل"
              >
                <Settings className="size-4" />
                {speed}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full end-0 mb-2 flex flex-col overflow-hidden rounded-lg bg-black/90">
                  {SPEED_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => changeSpeed(option)}
                      className={cn(
                        "px-4 py-1.5 text-caption hover:bg-white/10",
                        option === speed ? "text-primary" : "text-white/90",
                      )}
                    >
                      {option}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? "الخروج من ملء الشاشة" : "ملء الشاشة"}
            >
              {fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
