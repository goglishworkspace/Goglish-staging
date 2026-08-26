import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "./audit-log.service";

export async function getSettings(prefix?: string) {
  const admin = createAdminClient();
  let query = admin.from("platform_settings").select("key, value, updated_at").order("key");
  if (prefix) query = query.like("key", `${prefix}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function updateSettings(
  actorUserId: string,
  entries: Array<{ key: string; value: unknown }>,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("platform_settings").upsert(
    entries.map((entry) => ({ key: entry.key, value: entry.value, updated_by: actorUserId })),
    { onConflict: "key" },
  );
  if (error) throw error;

  await logAudit({
    actorUserId,
    action: "settings.updated",
    metadata: { keys: entries.map((entry) => entry.key) },
  });
}
