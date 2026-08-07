import { Trophy, Flame, Coins, Medal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { WidgetCard, WidgetEmpty } from "./WidgetCard";
import type { StudentDashboard } from "@/lib/services/dashboard.service";

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-lg bg-muted/50 px-3 py-4 text-center">
      <span className="text-h3 text-secondary dark:text-white">{value}</span>
      <span className="text-caption text-muted-foreground">{label}</span>
    </div>
  );
}

export function GamificationSection({ dashboard }: { dashboard: StudentDashboard }) {
  const rank = dashboard.current_rank as { rank: number; xp: number } | null;
  const badges = dashboard.badges as Array<{
    awarded_at: string;
    badges: { id: string; title: string; icon: string | null } | null;
  }>;

  return (
    <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
      <WidgetCard icon={Trophy} title="الإنجازات">
        <div className="flex w-full flex-wrap gap-3">
          <StatTile label={`XP (${dashboard.level?.title ?? "مبتدئ"})`} value={dashboard.total_xp} />
          <StatTile label="الترتيب" value={rank ? `#${rank.rank}` : "—"} />
          <StatTile label="Coins" value={dashboard.coins_total} />
          <StatTile label="أيام متتالية" value={dashboard.current_streak_days} />
        </div>
        <div className="mt-3 flex items-center gap-3 text-small text-muted-foreground">
          <Flame className="size-4 text-primary" />
          أطول سلسلة: {dashboard.longest_streak_days} يوم
          <Coins className="size-4 text-primary" />
        </div>
      </WidgetCard>

      <WidgetCard icon={Medal} title="الشارات">
        {badges.length ? (
          <div className="flex flex-wrap gap-2">
            {badges.map((b) =>
              b.badges ? (
                <Badge key={b.badges.id} variant="secondary">
                  {b.badges.title}
                </Badge>
              ) : null,
            )}
          </div>
        ) : (
          <WidgetEmpty text="لسه مفيش شارات، كمّل مذاكرة عشان تكسبها" />
        )}
      </WidgetCard>
    </div>
  );
}
