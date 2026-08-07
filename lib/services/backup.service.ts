import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "./audit-log.service";

const SIGNED_URL_TTL_SECONDS = 15 * 60;

// Representative set of high-value tables, not every table in the schema -
// a full pg_dump-equivalent is what Supabase's managed automated backups
// (Pro plan) are for; this is the "extra manual export" piece from the
// checklist, deliberately smaller in scope.
const BACKUP_TABLES = [
  "profiles",
  "courses",
  "subjects",
  "grades",
  "orders",
  "payments",
  "user_subscriptions",
  "invoices",
] as const;

/** Section 15 - Backup System. Exports a JSON snapshot of key tables to the
 * `backups` bucket and returns a signed download link. There is
 * deliberately no "restore" counterpart - restoring from an arbitrary file
 * can destroy real data and always needs human review, not a one-click API
 * call. */
export async function exportBackup(actorUserId: string): Promise<{ filename: string; url: string; expiresIn: number }> {
  const admin = createAdminClient();

  const snapshot: Record<string, unknown> = {};
  for (const table of BACKUP_TABLES) {
    const { data, error } = await admin.from(table).select("*");
    if (error) throw error;
    snapshot[table] = data;
  }

  const filename = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const storagePath = `exports/${filename}`;
  const { error: uploadError } = await admin.storage
    .from("backups")
    .upload(storagePath, Buffer.from(JSON.stringify(snapshot, null, 2)), { contentType: "application/json" });
  if (uploadError) throw uploadError;

  const { data: signed, error: signError } = await admin.storage
    .from("backups")
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (signError || !signed) throw signError ?? new Error("تعذر توليد رابط التنزيل");

  await logAudit({
    actorUserId,
    action: "backup.exported",
    metadata: { filename, tables: BACKUP_TABLES },
  });

  return { filename, url: signed.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS };
}
