import "server-only";
import type { NotificationChannel, NotificationChannelName } from "./types";
import { InAppNotificationChannel } from "./in-app.provider";
import { StubNotificationChannel } from "./stub.provider";

export * from "./types";

const channels: Record<NotificationChannelName, NotificationChannel> = {
  in_app: new InAppNotificationChannel(),
  email: new StubNotificationChannel("email"),
  sms: new StubNotificationChannel("sms"),
  push: new StubNotificationChannel("push"),
  whatsapp: new StubNotificationChannel("whatsapp"),
};

export function getNotificationChannel(name: NotificationChannelName): NotificationChannel {
  return channels[name];
}
