import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type Level = { level_number: number; min_xp: number; title: string };

export type GamificationMe = {
  xp_total: number;
  coins_total: number;
  current_streak_days: number;
  longest_streak_days: number;
  level: Level | null;
  next_level: Level | null;
};

export function useGamificationMe() {
  return useQuery({
    queryKey: ["gamification-me"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<GamificationMe>>("/api/gamification/me");
      return data.data;
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

export function useLevels() {
  return useQuery({
    queryKey: ["levels"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Level[]>>("/api/levels");
      return data.data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

export type AchievementEvent =
  | { type: "badge"; code: string; title: string; icon: string; at: string }
  | { type: "level_up"; level_number: number; title: string; at: string };

export function useAchievements() {
  return useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<AchievementEvent[]>>("/api/gamification/achievements");
      return data.data;
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

type BadgeDetails = { id: string; code: string; title: string; description: string | null; icon: string };

export type MyBadge = {
  awarded_at: string;
  badges: BadgeDetails | BadgeDetails[] | null;
};

/** `badges` comes back as an object OR a single-item array depending on how
 * PostgREST infers the embed cardinality - normalize both shapes here. */
export function getBadgeDetails(row: MyBadge): BadgeDetails | null {
  const badge = row.badges;
  if (!badge) return null;
  return Array.isArray(badge) ? (badge[0] ?? null) : badge;
}

export function useMyBadges() {
  return useQuery({
    queryKey: ["my-badges"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<MyBadge[]>>("/api/gamification/badges/me");
      return data.data;
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

/** Full public catalog (locked + unlocked) - separate from useMyBadges, which
 * only returns badges the student already earned. */
export function useBadgeCatalog() {
  return useQuery({
    queryKey: ["badge-catalog"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<BadgeDetails[]>>("/api/badges");
      return data.data;
    },
    staleTime: 30 * 60 * 1000,
  });
}
