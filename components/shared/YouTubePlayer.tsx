"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize,
  Minimize,
  Settings,
  Gauge,
  Volume2,
  Volume1,
  VolumeX,
} from "lucide-react";
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
  setPlaybackQualityRange?: (minQuality: string, maxQuality: string) => void;
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
  hd1080: "1080p HD",
  hd720: "720p HD",
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

export function YouTubePlayer({
  videoId,
  title,
  onTimeUpdate,
  seekTarget,
  children,
}: {
  videoId: string;
  title: string;
  /** Fires whenever playback position changes (poll while playing, plus every
   * seek/skip) - lets a sibling section (lesson notes) capture "where in the
   * video is this note about" without its own player reference. */
  onTimeUpdate?: (seconds: number) => void;
  /** Direct seek target requested from outside (e.g. clicking on a note timestamp). */
  seekTarget?: number | null;
  /** Child overlays (e.g. anti-piracy WatermarkOverlay) that stay visible even in fullscreen */
  children?: React.ReactNode;
}) {
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
  const [fullscreen, setFullscreen] = useState(false);
  const [isCssFullscreen, setIsCssFullscreen] = useState(false);
  const isCurrentlyFullscreen = fullscreen || isCssFullscreen;
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  // Handle external seek targets (e.g. jumping from smart note timestamps)
  useEffect(() => {
    if (seekTarget !== undefined && seekTarget !== null && playerRef.current && ready) {
      playerRef.current.seekTo(seekTarget, true);
      setCurrentTime(seekTarget);
      onTimeUpdateRef.current?.(seekTarget);
    }
  }, [seekTarget, ready]);

  // Whether to hide the control bar until :hover, checked at runtime instead
  // of via a Tailwind pointer-fine:/CSS media-query variant - combining
  // hover+pointer in one @media rule trips a parser bug in this project's
  // CSS minifier that breaks the entire stylesheet. Also can't key this off
  // viewport width (e.g. md:) - a phone in landscape or fullscreen easily
  // reports a "desktop-width" viewport while still being a touchscreen with
  // no hover at all, which would hide the bar with no way to reveal it.
  const [hoverCapable, setHoverCapable] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    // Genuinely can't know this during SSR (no window) or compute it via a
    // useState lazy initializer either - that runs during the client's first
    // render too, but its result gets discarded in favor of the server's
    // value to keep hydration consistent, so this has to be corrected here.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    setHoverCapable(query.matches);
    const onChange = (e: MediaQueryListEvent) => setHoverCapable(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

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
          cc_load_policy: 0,
        },
        events: {
          onReady: (event) => {
            setReady(true);
            setDuration(event.target.getDuration());
            setVolume(event.target.getVolume());
            setMuted(event.target.isMuted());
          },
          onStateChange: (event) => {
            setPlaying(event.data === PLAYING_STATE);
            const player = playerRef.current;
            if (!player) return;
            const currentQ = player.getPlaybackQuality?.();
            if (currentQ && currentQ !== "unknown") setQuality(currentQ);
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
      const time = player.getCurrentTime();
      setCurrentTime(time);
      setDuration(player.getDuration());
      onTimeUpdateRef.current?.(time);
      const q = player.getPlaybackQuality?.();
      if (q && q !== "unknown") setQuality(q);
    }, 250);
    return () => {
      if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
    };
  }, [playing]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const isDocFs = !!(
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
      );
      setFullscreen(isDocFs);
      if (!isDocFs) {
        setIsCssFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    };
  }, []);

  // Handle Escape key & body overflow for CSS Fullscreen fallback (e.g. iOS Safari)
  useEffect(() => {
    if (isCssFullscreen) {
      document.body.style.overflow = "hidden";
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setIsCssFullscreen(false);
        }
      };
      window.addEventListener("keydown", onKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", onKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [isCssFullscreen]);

  // Close menus when clicking outside
  useEffect(() => {
    if (!showSpeedMenu && !showQualityMenu) return;
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-player-menu]")) {
        setShowSpeedMenu(false);
        setShowQualityMenu(false);
      }
    };
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, [showSpeedMenu, showQualityMenu]);

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
    onTimeUpdateRef.current?.(target);
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const player = playerRef.current;
    if (!player) return;
    const time = Number(e.target.value);
    player.seekTo(time, true);
    setCurrentTime(time);
    onTimeUpdateRef.current?.(time);
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

  const toggleFullscreen = async () => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const isDocFs = !!(
      document.fullscreenElement ||
      (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
    );

    if (isDocFs) {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else {
          const doc = document as unknown as { webkitExitFullscreen?: () => void };
          doc.webkitExitFullscreen?.();
        }
      } catch {
        // ignore
      }
      setIsCssFullscreen(false);
      return;
    }

    if (isCssFullscreen) {
      setIsCssFullscreen(false);
      return;
    }

    try {
      if (wrapper.requestFullscreen) {
        await wrapper.requestFullscreen();
      } else {
        const el = wrapper as unknown as { webkitRequestFullscreen?: () => void };
        if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        } else {
          setIsCssFullscreen(true);
        }
      }
    } catch {
      setIsCssFullscreen(true);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "group relative w-full overflow-hidden bg-black transition-all",
        isCurrentlyFullscreen
          ? "fixed inset-0 z-[9999] h-[100dvh] w-screen rounded-none"
          : "aspect-video rounded-xl",
      )}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      {/* controls:0 only hides YouTube's own bottom control bar - it does
          NOT stop the title/channel link YouTube overlays on pause, the
          end-screen "more videos" cards near the end of playback, or the
          corner YouTube logo, all of which stay live and clickable inside
          the iframe. Since every control a viewer needs already exists in
          our own bar below, this layer's only job is to sit between the
          mouse and the iframe so none of that native, click-through-to-
          YouTube UI is ever reachable - clicking it just toggles play,
          same as clicking a normal video would. */}
      <button
        type="button"
        onClick={() => {
          setShowQualityMenu(false);
          setShowSpeedMenu(false);
          togglePlay();
        }}
        disabled={!ready}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full cursor-pointer"
      />

      {/* Overlaid children (e.g. WatermarkOverlay) - stays visible in normal & fullscreen */}
      {children}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 flex flex-col gap-1.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2.5 sm:p-3 transition-opacity",
          hoverCapable ? "opacity-0 group-hover:opacity-100 focus-within:opacity-100" : "opacity-100",
        )}
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={onSeek}
          disabled={!ready}
          className="h-1.5 w-full cursor-pointer accent-primary hover:h-2 transition-all"
          aria-label={`موضع الفيديو - ${title}`}
        />
        <div className="flex items-center justify-between gap-1 sm:gap-2 text-white">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={togglePlay}
              disabled={!ready}
              aria-label={playing ? "إيقاف" : "تشغيل"}
              className="p-1 hover:text-primary transition-colors shrink-0"
            >
              {playing ? <Pause className="size-4 sm:size-5" /> : <Play className="size-4 sm:size-5" />}
            </button>
            <button
              type="button"
              onClick={() => skip(-SKIP_SECONDS)}
              disabled={!ready}
              aria-label="رجوع 10 ثواني"
              className="p-1 hover:text-primary transition-colors shrink-0"
            >
              <RotateCcw className="size-4 sm:size-5" />
            </button>
            <button
              type="button"
              onClick={() => skip(SKIP_SECONDS)}
              disabled={!ready}
              aria-label="تقديم 10 ثواني"
              className="p-1 hover:text-primary transition-colors shrink-0"
            >
              <RotateCw className="size-4 sm:size-5" />
            </button>
            <span className="text-[11px] sm:text-caption tabular-nums text-white/90 shrink-0 select-none">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={toggleMute}
                disabled={!ready}
                aria-label={muted || volume === 0 ? "إلغاء الكتم" : "كتم الصوت"}
                className="p-1 hover:text-primary transition-colors shrink-0"
              >
                {muted || volume === 0 ? (
                  <VolumeX className="size-4 sm:size-5" />
                ) : volume < 50 ? (
                  <Volume1 className="size-4 sm:size-5" />
                ) : (
                  <Volume2 className="size-4 sm:size-5" />
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
                className="hidden sm:block h-1 w-14 lg:w-16 cursor-pointer accent-primary"
                aria-label="مستوى الصوت"
              />
            </div>
          </div>

          <div className="relative flex items-center gap-1 sm:gap-2.5 shrink-0">
            <div className="relative" data-player-menu>
              <button
                type="button"
                onClick={() => {
                  setShowQualityMenu((v) => !v);
                  setShowSpeedMenu(false);
                }}
                className="flex items-center gap-1 px-1.5 py-1 text-[11px] sm:text-caption text-white/90 hover:text-white rounded hover:bg-white/10 transition-colors"
                aria-label="جودة الفيديو"
              >
                <Gauge className="size-3.5 sm:size-4 shrink-0 text-primary" />
                <span className="hidden sm:inline font-medium">
                  {quality === "auto" ? "تلقائي" : (QUALITY_LABELS[quality] ?? quality)}
                </span>
              </button>
              {showQualityMenu && (
                <div className="absolute bottom-full end-0 mb-2 flex flex-col overflow-hidden rounded-xl bg-black/95 border border-white/15 shadow-2xl p-3 min-w-[210px] sm:min-w-[230px] z-50 text-right select-none">
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-2">
                    <span className="text-xs font-semibold text-white">جودة البث</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                      <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                      تلقائي ذكي
                    </span>
                  </div>
                  <div className="space-y-2 text-[11px] text-white/80 leading-relaxed">
                    <div className="flex items-center justify-between text-white font-medium bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/5">
                      <span className="text-white/60">الدقة الحالية:</span>
                      <span className="text-primary font-bold">{QUALITY_LABELS[quality] ?? (quality === "auto" ? "HD تلقائي" : quality)}</span>
                    </div>
                    <p className="text-[10px] text-white/60">
                      يتم ضبط الجودة تلقائياً لأعلى دقة مدعومة بدون تقطيع وفقاً لسرعة الإنترنت.
                    </p>
                    <div className="pt-1.5 border-t border-white/10 flex items-start gap-1.5 text-[10px] text-amber-300">
                      <span className="shrink-0">💡</span>
                      <span>ادخل وضع ملء الشاشة لعرض الفيديو بأعلى دقة تلقائياً.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="relative" data-player-menu>
              <button
                type="button"
                onClick={() => {
                  setShowSpeedMenu((v) => !v);
                  setShowQualityMenu(false);
                }}
                className="flex items-center gap-1 px-1.5 py-1 text-[11px] sm:text-caption text-white/90 hover:text-white rounded hover:bg-white/10 transition-colors"
                aria-label="سرعة التشغيل"
              >
                <Settings className="size-3.5 sm:size-4 shrink-0" />
                <span className="text-[11px] sm:text-caption">{speed}x</span>
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full end-0 mb-2 flex flex-col overflow-hidden rounded-lg bg-black/95 border border-white/15 shadow-2xl py-1 min-w-[90px] z-50">
                  <div className="px-3 py-1 text-[10px] text-white/50 border-b border-white/10 font-medium">
                    السرعة
                  </div>
                  {SPEED_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => changeSpeed(option)}
                      className={cn(
                        "flex items-center justify-between px-3 py-1.5 text-xs hover:bg-white/15 transition-colors",
                        option === speed ? "text-primary font-bold bg-white/5" : "text-white/90",
                      )}
                    >
                      <span>{option}x</span>
                      {option === speed && <span className="text-[10px] text-primary">●</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1 sm:p-1.5 hover:text-primary transition-colors shrink-0 rounded hover:bg-white/10"
              aria-label={isCurrentlyFullscreen ? "الخروج من ملء الشاشة" : "ملء الشاشة"}
            >
              {isCurrentlyFullscreen ? (
                <Minimize className="size-4 sm:size-5" />
              ) : (
                <Maximize className="size-4 sm:size-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
