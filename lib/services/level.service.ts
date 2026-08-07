import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type Level = { level_number: number; min_xp: number; title: string };

/** `levels` is tiny (~10 rows) and public - fetching all of it and reducing
 * in-memory is simpler and cheaper than a per-call SQL max() query. */
export async function getAllLevels(): Promise<Level[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("levels").select("level_number, min_xp, title").order("min_xp");
  if (error) throw error;
  return data ?? [];
}

export function resolveLevelForXp(levels: Level[], xp: number): Level | null {
  let current: Level | null = null;
  for (const level of levels) {
    if (level.min_xp <= xp) current = level;
    else break;
  }
  return current;
}

export async function getLevelForXp(xp: number): Promise<Level | null> {
  const levels = await getAllLevels();
  return resolveLevelForXp(levels, xp);
}
