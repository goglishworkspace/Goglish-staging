export type NotificationChannelName = "in_app" | "email" | "sms" | "push" | "whatsapp";

export type NotificationPayload = {
  userId: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

/** Common interface every channel implements (Section 12 - Email, SMS, Push,
 * In-App, WhatsApp), same Interface+Stub shape as VideoProvider/
 * PaymentProvider/PhoneProvider elsewhere in this project. In-App is the one
 * real implementation (a direct DB write); everything else is a stub. */
export interface NotificationChannel {
  readonly name: NotificationChannelName;
  send(payload: NotificationPayload): Promise<void>;
}
