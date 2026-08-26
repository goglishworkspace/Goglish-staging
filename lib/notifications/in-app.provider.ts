import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationChannel, NotificationPayload } from "./types";

/** The one real channel - always on, never subject to notification_preferences
 * (Section 12 note: "in_app دايماً مفعّل"). Writes straight to `notifications`
 * (Phase 4's table). */
export class InAppNotificationChannel implements NotificationChannel {
  readonly name = "in_app" as const;

  async send(payload: NotificationPayload): Promise<void> {
    const admin = createAdminClient();
    const { error } = await admin.from("notifications").insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      metadata: payload.metadata ?? null,
    });
    if (error) throw error;
  }
}
