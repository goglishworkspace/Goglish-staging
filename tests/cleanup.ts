import { createAdminClient } from "@/lib/supabase/admin";

/** Tracks auth user ids created during a test file and deletes them afterwards
 * (cascades to profiles/devices/role_user via ON DELETE CASCADE). */
export function createUserRegistry() {
  const userIds: string[] = [];

  return {
    track(userId: string) {
      userIds.push(userId);
    },
    async cleanupAll() {
      const admin = createAdminClient();
      for (const id of userIds) {
        await admin.auth.admin.deleteUser(id).catch(() => {});
      }
      userIds.length = 0;
    },
  };
}
