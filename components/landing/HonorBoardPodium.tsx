import { Crown } from "lucide-react";
import { AvatarImage } from "@/components/shared/AvatarImage";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/api/queries/honor-board";

// Visual left-to-right order for a classic Olympic-style podium (2nd, 1st,
// 3rd) - a spatial/graphic convention, so it stays the same regardless of
// RTL text direction (a medal-ceremony photo isn't mirrored for Arabic).
const PODIUM_ORDER = [1, 0, 2] as const;
const AVATAR_SIZES = [88, 64, 64];
const RING_COLORS = ["ring-primary", "ring-zinc-300 dark:ring-zinc-500", "ring-amber-700"];
const STEP_HEIGHTS = ["h-24 sm:h-28", "h-16 sm:h-20", "h-11 sm:h-14"];
const STEP_STYLES = [
  "bg-gradient-to-b from-primary to-warning text-secondary",
  "bg-gradient-to-b from-zinc-200 to-zinc-300 text-zinc-700 dark:from-zinc-500 dark:to-zinc-600 dark:text-zinc-100",
  "bg-gradient-to-b from-amber-600 to-amber-800 text-white",
];

export function HonorBoardPodium({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="flex w-full items-end justify-center gap-3 sm:gap-6">
      {PODIUM_ORDER.map((entryIndex) => {
        const entry = entries[entryIndex];
        if (!entry) return <div key={entryIndex} className="w-24 sm:w-32" />;
        const isFirst = entryIndex === 0;

        return (
          <div key={entry.user_id} className="flex w-24 flex-col items-center sm:w-32">
            <div className="relative">
              {isFirst && (
                <Crown className="absolute -top-5 left-1/2 size-6 -translate-x-1/2 fill-primary text-primary" />
              )}
              <AvatarImage
                src={entry.avatar_url}
                initials={(entry.name ?? "ط").charAt(0)}
                alt={entry.name ?? "طالب"}
                size={AVATAR_SIZES[entryIndex]}
                className={cn("ring-4 ring-offset-2 ring-offset-background", RING_COLORS[entryIndex])}
              />
            </div>

            <p className="mt-2 line-clamp-1 w-full text-small font-semibold text-foreground">
              {entry.name ?? "طالب"}
            </p>
            <p className="text-caption text-muted-foreground">{entry.xp.toLocaleString("ar-EG")} XP</p>

            {/* the podium step itself - height and shade signal the rank,
                same way a real medal-ceremony stage does */}
            <div
              className={cn(
                "mt-3 flex w-full items-start justify-center rounded-t-xl pt-2 shadow-inner",
                STEP_HEIGHTS[entryIndex],
                STEP_STYLES[entryIndex],
              )}
            >
              <span className="text-h1 font-bold">{entry.rank}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
