"use client";

import { useEffect, type ReactNode } from "react";

/**
 * Frontend-only deterrents (Section 7) - these raise the bar for casual
 * copying, they are NOT real protection. Screen recording bypasses all of
 * this entirely; the actual protection is the unlisted YouTube upload +
 * server-side purchase gate (see lib/services/lesson-playback.service.ts)
 * plus the personalized client-side watermark overlay - there's no
 * signed/expiring URL the way a provider like Bunny would offer. No
 * devtools-open blur here - that heuristic (comparing outerWidth/innerWidth)
 * false-positives in embedded/automated browser contexts and blurs the
 * video for legitimate viewers too.
 */
export function VideoDeterrents({ children }: { children: ReactNode }) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isDevToolsShortcut =
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && e.key.toLowerCase() === "u");
      if (isDevToolsShortcut) e.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div onContextMenu={(e) => e.preventDefault()} className="select-none">
      {children}
    </div>
  );
}
