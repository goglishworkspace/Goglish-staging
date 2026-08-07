import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNotificationChannel, type NotificationChannelName, type NotificationPayload } from "@/lib/notifications";

const OPTIONAL_CHANNELS: Exclude<NotificationChannelName, "in_app">[] = ["email", "sms", "push", "whatsapp"];

/** Single entry point for sending a notification (Section 12). Always writes
 * in-app; for every other channel, checks notification_preferences first - a
 * missing row means "enabled" (the default), matching the migration's note. */
export async function dispatchNotification(payload: NotificationPayload): Promise<void> {
  await getNotificationChannel("in_app").send(payload);

  const admin = createAdminClient();
  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("channel, enabled")
    .eq("user_id", payload.userId);
  const disabledChannels = new Set(
    (prefs ?? []).filter((pref) => !pref.enabled).map((pref) => pref.channel as NotificationChannelName),
  );

  for (const channel of OPTIONAL_CHANNELS) {
    if (disabledChannels.has(channel)) continue;
    await getNotificationChannel(channel).send(payload);
  }
}
