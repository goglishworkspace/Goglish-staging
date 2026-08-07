import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Goglish is Arabic-first - most titles have no a-z0-9 characters at all, so
 * a plain Latin-only slugify collapses almost every title down to the same
 * near-empty string (e.g. any title mentioning "QA" alone becomes "-qa-"),
 * causing silent unique-constraint collisions on the second row. Slugs here
 * aren't used for routing (pages route by id), so a unique suffix is
 * appended unconditionally rather than only as an empty-string fallback. */
/** Accepts a full YouTube URL (watch/youtu.be/embed/shorts) or a bare 11-char
 * video ID and returns just the ID - youtube.provider.ts's getEmbedUrl()
 * expects the raw ID, not a URL. Returns null if nothing recognizable. */
export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1) || null;
    if (url.pathname.startsWith("/embed/")) return url.pathname.replace("/embed/", "");
    if (url.pathname.startsWith("/shorts/")) return url.pathname.replace("/shorts/", "");
    return url.searchParams.get("v");
  } catch {
    return null;
  }
}

export function slugify(title: string) {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
  const uniqueSuffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  return base ? `${base}-${uniqueSuffix}` : `item-${uniqueSuffix}`;
}
