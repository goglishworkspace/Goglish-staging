"use client";

import Link from "next/link";
import { Zap, Coins, Flame, Trophy, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/api/queries/profile";

export function StudentStatsCard({ profile }: { profile: Profile }) {
  return (
    <Card className="w-full overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm">
      <CardContent className="flex flex-col gap-6 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-h3 text-secondary dark:text-white flex items-center gap-2">
              <Award className="size-5 text-primary" />
              إنجازاتي ومستواي التعليمي
            </h2>
            <p className="mt-1 text-caption text-muted-foreground">
              استمر في المذاكرة وحل الكويزات لتزيد نقاطك وتتصدر لوحة الشرف!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" render={<Link href="/student/leaderboard" />}>
              <Trophy className="size-4 me-1.5 text-amber-500" />
              لوحة المتصدرين
            </Button>
            <Button variant="outline" size="sm" render={<Link href="/student/honor-board" />}>
              <Award className="size-4 me-1.5 text-primary" />
              لوحة الشرف
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* XP Points */}
          <div className="flex items-center gap-4 rounded-xl border border-border/80 bg-background/60 p-4 shadow-sm">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Zap className="size-6 fill-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-caption text-muted-foreground">نقاط المذاكرة (XP)</p>
              <p className="text-h3 font-bold text-foreground">
                {(profile.xp_total ?? 0).toLocaleString("ar-EG")}
                <span className="text-caption font-normal text-muted-foreground ms-1">نقطة</span>
              </p>
            </div>
          </div>

          {/* Coins */}
          <div className="flex items-center gap-4 rounded-xl border border-border/80 bg-background/60 p-4 shadow-sm">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
              <Coins className="size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-caption text-muted-foreground">العملات المكتسبة</p>
              <p className="text-h3 font-bold text-foreground">
                {(profile.coins_total ?? 0).toLocaleString("ar-EG")}
                <span className="text-caption font-normal text-muted-foreground ms-1">عملة</span>
              </p>
            </div>
          </div>

          {/* Streak */}
          <div className="flex items-center gap-4 rounded-xl border border-border/80 bg-background/60 p-4 shadow-sm">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
              <Flame className="size-6 fill-orange-500" />
            </div>
            <div className="min-w-0">
              <p className="text-caption text-muted-foreground">حماسة المذاكرة (Streak)</p>
              <div className="flex items-baseline gap-2">
                <p className="text-h3 font-bold text-foreground">
                  {profile.current_streak_days ?? 0}
                  <span className="text-caption font-normal text-muted-foreground ms-1">أيام متتالية</span>
                </p>
              </div>
              {(profile.longest_streak_days ?? 0) > 0 && (
                <p className="text-caption text-muted-foreground mt-0.5">
                  أعلى رقم قياسي: {profile.longest_streak_days} يوم 🔥
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
