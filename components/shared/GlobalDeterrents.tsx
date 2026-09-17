"use client";

import { useEffect } from "react";

/**
 * Site-wide keyboard deterrents for common developer shortcut keys.
 * UX-004: Global contextmenu (right-click) blocking removed to maintain standard web ergonomics
 * (translations, spelling, selecting text). Video player protection remains scoped in VideoDeterrents.tsx.
 * UX-005: Window-resize/DevTools size heuristic reload removed to prevent unexpected data loss
 * during exams, forms, or window dragging across monitors.
 */
export function GlobalDeterrents() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isDevToolsShortcut =
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && e.key.toLowerCase() === "u");
      if (isDevToolsShortcut) e.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}
