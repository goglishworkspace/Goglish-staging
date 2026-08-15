import { Crown } from "lucide-react";
import { AvatarImage } from "@/components/shared/AvatarImage";
import { cn } from "@/lib/utils";
import { royalSerif } from "@/lib/fonts";
import type { LeaderboardEntry } from "@/lib/api/queries/honor-board";

// Visual left-to-right order for a classic Olympic-style podium (2nd, 1st,
// 3rd) - a spatial/graphic convention, so it stays the same regardless of
// RTL text direction (a medal-ceremony photo isn't mirrored for Arabic).
const PODIUM_ORDER = [1, 0, 2] as const;
const ROMAN = ["I", "II", "III"] as const;

const TIER = [
  {
    width: "w-28 sm:w-40",
    avatarSize: 96,
    ring: "ring-[#f5c518]",
    glow: "shadow-[0_0_30px_-4px_rgba(245,197,24,0.65)]",
    pedestalHeight: "h-28 sm:h-32",
    pedestal:
      "bg-gradient-to-b from-[#ffe28a] via-[#f5c518] to-[#a8790a] text-[#3a2600] shadow-[inset_0_2px_0_rgba(255,255,255,0.6)]",
    shimmer: true,
  },
  {
    width: "w-24 sm:w-32",
    avatarSize: 68,
    ring: "ring-zinc-300",
    glow: "shadow-[0_0_18px_-4px_rgba(200,210,220,0.5)]",
    pedestalHeight: "h-20 sm:h-24",
    pedestal:
      "bg-gradient-to-b from-zinc-100 via-zinc-300 to-zinc-500 text-zinc-800 shadow-[inset_0_2px_0_rgba(255,255,255,0.5)]",
    shimmer: false,
  },
  {
    width: "w-24 sm:w-32",
    avatarSize: 68,
    ring: "ring-amber-600",
    glow: "shadow-[0_0_18px_-4px_rgba(180,110,40,0.5)]",
    pedestalHeight: "h-16 sm:h-20",
    pedestal:
      "bg-gradient-to-b from-amber-400 via-amber-600 to-amber-900 text-amber-50 shadow-[inset_0_2px_0_rgba(255,255,255,0.35)]",
    shimmer: false,
  },
] as const;

function VacantPedestal({ tier }: { tier: (typeof TIER)[number] }) {
  return (
    <div className={cn("flex flex-col items-center", tier.width)}>
      <div
        className="flex items-center justify-center rounded-full border-2 border-dashed border-white/25"
        style={{ width: tier.avatarSize, height: tier.avatarSize }}
      >
        <Crown className="size-1/3 text-white/25" />
      </div>
      <span className="mt-2 text-caption whitespace-nowrap text-white/45">بانتظار بطل</span>
      <div
        className={cn(
          "mt-3 w-full rounded-t-2xl border border-dashed border-white/15 bg-white/[0.04]",
          tier.pedestalHeight,
        )}
      />
    </div>
  );
}

export function HonorBoardPodium({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-b from-[#181832] via-[#101024] to-[#0a0a18] px-6 py-12 sm:px-10">
      {/* engraved gold hairline along the top edge of the stage */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f5c518]/70 to-transparent" />
      {/* soft spotlight glow behind the champion */}
      <div className="pointer-events-none absolute top-6 left-1/2 size-56 -translate-x-1/2 rounded-full bg-[#f5c518]/25 blur-3xl" />

      <div className="relative flex w-full items-end justify-center gap-3 sm:gap-6">
        {PODIUM_ORDER.map((entryIndex) => {
          const entry = entries[entryIndex];
          const tier = TIER[entryIndex];
          const isFirst = entryIndex === 0;

          if (!entry) return <VacantPedestal key={entryIndex} tier={tier} />;

          return (
            <div key={entry.user_id} className={cn("flex flex-col items-center", tier.width)}>
              <div className="relative">
                {isFirst && (
                  <Crown
                    className="absolute -top-6 left-1/2 size-7 -translate-x-1/2 fill-[#f5c518] text-[#f5c518] drop-shadow-[0_0_6px_rgba(245,197,24,0.8)]"
                  />
                )}
                <AvatarImage
                  src={entry.avatar_url}
                  initials={(entry.name ?? "ط").charAt(0)}
                  alt={entry.name ?? "طالب"}
                  size={tier.avatarSize}
                  className={cn("ring-4 ring-offset-4 ring-offset-[#101024]", tier.ring, tier.glow)}
                />
              </div>

              <span className="mt-3 max-w-full truncate rounded-full bg-white/10 px-3 py-1 text-small font-semibold text-white ring-1 ring-white/10">
                {entry.name ?? "طالب"}
              </span>

              <p className={cn(royalSerif.className, "mt-1 text-2xl leading-none font-bold text-[#f5c518] sm:text-3xl")}>
                {entry.xp.toLocaleString("ar-EG")}
              </p>
              <p className="text-[10px] tracking-[0.2em] text-white/45">XP</p>

              {/* the podium step itself - height and shade signal the rank,
                  same way a real medal-ceremony stage does */}
              <div
                className={cn(
                  "relative mt-3 flex w-full items-start justify-center overflow-hidden rounded-t-2xl pt-2",
                  tier.pedestalHeight,
                  tier.pedestal,
                )}
              >
                <span className={cn(royalSerif.className, "text-4xl font-bold")}>{ROMAN[entryIndex]}</span>
                {tier.shimmer && (
                  <span className="honor-shimmer pointer-events-none absolute inset-0" aria-hidden />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
