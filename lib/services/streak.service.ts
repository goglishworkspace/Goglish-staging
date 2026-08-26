import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Thin wrapper over record_daily_activity() (idempotent per UTC day) - see
 * that function for the streak/reward logic itself. */
export async function recordDailyActivity(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("record_daily_activity", { p_user_id: userId });
  if (error) throw error;
}
