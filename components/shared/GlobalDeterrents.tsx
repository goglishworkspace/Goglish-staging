"use client";

import { useEffect, useRef } from "react";

const DEVTOOLS_SIZE_THRESHOLD = 160;
const DEVTOOLS_POLL_MS = 1000;

/**
 * Site-wide frontend deterrents, mounted once in the root layout so they
 * apply to every page. NOT real protection - a determined user can still
 * open DevTools via the browser's own menu (⋮ > More tools > Developer
 * tools) or screen-record the page; this only raises the bar for casual
 * inspection, same spirit as VideoDeterrents.tsx (which stays as-is for its
 * lesson-page-specific blur reaction, this doesn't replace it).
 *
 * Right-click: blocked reliably via preventDefault on the native
 * "contextmenu" event - this one actually works in every browser.
 *
 * F12 / Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C / Ctrl+U: preventDefault
 * is attempted, but modern Chrome/Edge treat these as browser-level
 * shortcuts that open DevTools *before* page JS ever sees the keydown, by
 * design (so a page can never fully lock a user out of their own browser's
 * tools). This will not reliably stop DevTools from opening in current
 * Chrome - it's kept because it still works in some browsers/older
 * versions, and costs nothing.
 *
 * The one thing that's actually enforceable: detecting that DevTools is
 * already open (undockable panels change the gap between window.outerWidth/
 * outerHeight and innerWidth/innerHeight) and reacting to it - here, a full
 * page reload. This only fires on a closed→open transition (never on the
 * initial mount state, and never repeatedly while it stays open), which
 * avoids a reload loop right after the reload itself lands with DevTools
 * still open. Caveat: the size-heuristic can false-positive on legitimate
 * window resizes (e.g. dragging between monitors with different DPI), which
 * would cause an unexpected reload and lose any unsaved input on the page -
 * a real tradeoff of this approach, not a bug.
 */
export function GlobalDeterrents() {
  const previousOpenRef = useRef<boolean | null>(null);

  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const onKeyDown = (e: KeyboardEvent) => {
      const isDevToolsShortcut =
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && e.key.toLowerCase() === "u");
      if (isDevToolsShortcut) e.preventDefault();
    };

    const checkDevToolsOpen = () => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      const open = widthDiff > DEVTOOLS_SIZE_THRESHOLD || heightDiff > DEVTOOLS_SIZE_THRESHOLD;

      if (previousOpenRef.current === false && open) {
        window.location.reload();
        return;
      }
      previousOpenRef.current = open;
    };

    document.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKeyDown);
    const interval = window.setInterval(checkDevToolsOpen, DEVTOOLS_POLL_MS);

    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
