import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** A soft-deleted account (profiles.deleted_at set by
 * softDeleteUser/DELETE /api/admin/users/[id]) should stop being publicly
 * visible immediately - not just once the hard-delete cron actually
 * removes the row. But `teachers.user_id` and `profiles.id` are sibling FKs
 * to auth.users, not FKs to each other (same situation as course_teachers),
 * so softDeleteUser can't cascade into `teachers` via the DB, and every
 * public teacher-facing query has to cross-check deleted_at separately.
 * Uses the admin client only to read this one narrow flag - the caller
 * still only shows/hides rows, never leaks anything else about the profile. */
export async function getDeletedUserIds(userIds: string[]): Promise<Set<string>> {
  if (!userIds.length) return new Set();
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .in("id", userIds)
    .not("deleted_at", "is", null);
  return new Set((data ?? []).map((p) => p.id as string));
}
