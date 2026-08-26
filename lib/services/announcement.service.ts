import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchNotificationToMany } from "./notification-dispatch.service";

/** Creates the announcement then fans it out as a notification to every
 * matching user (Section 10 - simple synchronous fan-out, no queue system,
 * matching the project's current scale). `target: 'all'` means every
 * registered user (profiles is 1:1 with auth.users); `target: 'grade'`
 * narrows to that grade only. */
export async function createAnnouncementAndNotify(params: {
  title: string;
  body: string;
  target: "all" | "grade";
  targetGrade: string | null;
  createdBy: string;
  expiresAt: string | null;
}): Promise<{ id: string }> {
  const admin = createAdminClient();

  const { data: announcement, error } = await admin
    .from("announcements")
    .insert({
      title: params.title,
      body: params.body,
      target: params.target,
      target_grade: params.targetGrade,
      created_by: params.createdBy,
      expires_at: params.expiresAt,
    })
    .select("id")
    .single();
  if (error) throw error;

  let query = admin.from("profiles").select("id").is("deleted_at", null);
  if (params.target === "grade") query = query.eq("grade", params.targetGrade);
  const { data: recipients } = await query;

  await dispatchNotificationToMany((recipients ?? []).map((recipient) => recipient.id), {
    type: "announcement",
    title: params.title,
    body: params.body,
    metadata: { announcement_id: announcement.id },
  });

  return announcement;
}
