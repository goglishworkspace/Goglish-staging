import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Section 25 - "كل العمليات تُسجَّل". Scoped to the admin actions Phase 7
 * introduces plus comment-moderation decisions (explicitly required) - not
 * retrofitted across every route from Phases 1-6. `actorUserId` is null for
 * system/cron-triggered actions (e.g. the daily hard-delete sweep). */
export async function logAudit(params: {
  actorUserId: string | null;
  action: string;
  targetTable?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("audit_logs").insert({
    actor_user_id: params.actorUserId,
    action: params.action,
    target_table: params.targetTable ?? null,
    target_id: params.targetId ?? null,
    metadata: params.metadata ?? null,
  });
  if (error) throw error;
}
