import "server-only";
import type { NotificationChannel, NotificationChannelName, NotificationPayload } from "./types";

/**
 * Shared stub for Email/SMS/Push/WhatsApp (Section 12) - no real provider
 * accounts exist yet (same reasoning as lib/payments/stub.provider.ts).
 * Logs instead of calling a real API; swap in a real implementation per
 * channel later without touching any calling code.
 */
export class StubNotificationChannel implements NotificationChannel {
  constructor(readonly name: Exclude<NotificationChannelName, "in_app">) {}

  async send(payload: NotificationPayload): Promise<void> {
    console.log(`[Stub${this.name}Channel] would notify user ${payload.userId}: "${payload.title}"`);
  }
}
