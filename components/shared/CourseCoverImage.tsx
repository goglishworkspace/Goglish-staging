"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

interface CourseCoverImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  containerClassName?: string;
}

function CourseCoverImageInner({
  src,
  alt,
  className,
  containerClassName,
}: CourseCoverImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const showFallback = !src || hasError;

  return (
    <div
      className={cn(
        "relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-primary/20",
        containerClassName,
      )}
    >
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -right-6 -top-6 size-36 rounded-full bg-primary/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 size-36 rounded-full bg-amber-500/15 blur-2xl" />

      {!showFallback ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={cn(
              "h-full w-full object-cover transition-all duration-700 group-hover:scale-105",
              isLoaded ? "opacity-100" : "opacity-0",
              className,
            )}
          />

          {/* Vignette & Gradient Overlays for readable badges and titles (neutral dark for both light and dark mode) */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />
        </>
      ) : null}

      {/* Luxury Royal Fallback Placeholder */}
      {showFallback && (
        <div className="relative flex h-full w-full flex-col items-center justify-center p-4 text-center select-none">
          <div className="relative flex size-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-lg shadow-primary/10 backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
            <GraduationCap className="size-8 text-primary" />
            <div className="absolute -inset-1 -z-10 rounded-2xl bg-primary/20 blur-md" />
          </div>

          <span className="mt-2.5 max-w-[85%] truncate text-xs font-semibold text-foreground/80 tracking-wide">
            {alt}
          </span>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>
      )}
    </div>
  );
}

export function CourseCoverImage(props: CourseCoverImageProps) {
  // Keying resets state automatically when src changes without needing useEffect
  return <CourseCoverImageInner key={props.src ?? "no-src"} {...props} />;
}
