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

const DEFAULT_FANOUT_CONCURRENCY = 20;

/** Fans a notification out to many users (announcements, "new lesson in your
 * course", "new course in your bundle") capped at a fixed concurrency,
 * instead of firing every dispatchNotification() call at once - each one
 * does its own notification_preferences query plus up to 4 channel sends, so
 * an unbounded Promise.all() over hundreds/thousands of recipients can
 * exhaust the DB connection pool under load. A worker pool of `concurrency`
 * pulls from the shared list until it's drained, rather than batching in
 * fixed-size chunks, so a few slow sends never stall the rest of the batch
 * behind them. */
export async function dispatchNotificationToMany(
  userIds: string[],
  payload: Omit<NotificationPayload, "userId">,
  concurrency: number = DEFAULT_FANOUT_CONCURRENCY,
): Promise<void> {
  let index = 0;
  async function worker(): Promise<void> {
    while (index < userIds.length) {
      const userId = userIds[index++];
      await dispatchNotification({ ...payload, userId });
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, userIds.length) }, worker));
}
