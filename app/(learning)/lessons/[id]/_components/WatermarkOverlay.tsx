"use client";

import { useEffect, useMemo, useState } from "react";

const REPOSITION_INTERVAL_MS = 30_000;
// Keep the badge fully inside the frame with a margin, rather than jumping
// between 4 known corners - a fixed 4-position pattern is trivially defeated
// by cropping/blurring all 4 corners once; a random spot anywhere in this
// range isn't.
const POSITION_RANGE = { minPercent: 6, maxPercent: 82 };

function randomPercent() {
  return POSITION_RANGE.minPercent + Math.random() * (POSITION_RANGE.maxPercent - POSITION_RANGE.minPercent);
}

function buildTiledBackground(text: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="110">
    <text x="0" y="60" fill="#ffffff" font-family="sans-serif" font-size="15" font-weight="600">${text}</text>
  </svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * Two layers, same info, different jobs (Section: video piracy deterrent):
 * - a small, clearly-readable badge that jumps to a random spot on the
 *   frame periodically, easy to read at a glance;
 * - a very faint (~10% opacity) diagonal tiled repeat of the same text
 *   covering the entire frame, near-invisible while watching but expensive
 *   to remove (a casual watermark-remover app targets one static box, not a
 *   repeating pattern across the whole image).
 */
export function WatermarkOverlay({
  watermark,
}: {
  watermark: {
    studentName?: string | null;
    phone?: string | null;
    nationalId?: string | null;
    logoText: string;
  };
}) {
  const [position, setPosition] = useState({ top: 8, left: 8 });

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPosition({ top: randomPercent(), left: randomPercent() });
    }, REPOSITION_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  const text = useMemo(() => {
    const parts = [watermark.logoText];
    if (watermark.studentName) parts.push(watermark.studentName);
    if (watermark.phone) parts.push(watermark.phone);
    else if (watermark.nationalId) parts.push(watermark.nationalId);
    return parts.join(" • ");
  }, [watermark]);

  const tiledBackground = useMemo(() => buildTiledBackground(text), [text]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-[-25%] opacity-[0.04]"
        style={{
          backgroundImage: tiledBackground,
          backgroundRepeat: "repeat",
          transform: "rotate(-22deg)",
        }}
      />
      <div
        className="absolute flex flex-col items-end gap-0.5 rounded-md bg-black/20 border border-white/10 px-1.5 py-0.5 text-[9px] text-white/50 backdrop-blur-[1px] transition-[top,left] duration-1000 sm:text-[11px] select-none shadow-sm"
        style={{ top: `${position.top}%`, left: `${position.left}%` }}
      >
        <span className="font-semibold text-white/60">{watermark.logoText}</span>
        {watermark.studentName && <span className="text-white/50">{watermark.studentName}</span>}
        {(watermark.phone || watermark.nationalId) && (
          <span dir="ltr" className="text-white/50">{watermark.phone || watermark.nationalId}</span>
        )}
      </div>
    </div>
  );
}
