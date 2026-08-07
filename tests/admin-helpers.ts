import { createAdminClient } from "@/lib/supabase/admin";

/** Simulates the user clicking the confirmation email link, without needing
 * to parse Inbucket - used by tests that need a login-ready account. */
export async function confirmUserEmail(userId: string) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  if (error) throw error;
}
