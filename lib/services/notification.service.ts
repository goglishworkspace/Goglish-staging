import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchNotification } from "./notification-dispatch.service";

/** Notifies the student, and - if the plan is Premium and a parent link
 * exists - the linked parent too (Section 9: "Notifications عند الدفع
 * للطالب + ولي الأمر إن Premium"). Silently skips the parent notification
 * when no link exists (parent_student_links is a lightweight foundation,
 * not the full Parent Portal - see Phase 6 for that). */
export async function notifyPaymentCompleted(params: {
  userId: string;
  itemTitle: string;
  totalCents: number;
  currency: string;
  isPremium: boolean;
}): Promise<void> {
  const amount = (params.totalCents / 100).toFixed(2);

  await dispatchNotification({
    userId: params.userId,
    type: "payment_completed",
    title: "تم الدفع بنجاح",
    body: `تم دفع ${amount} ${params.currency} مقابل ${params.itemTitle}`,
    metadata: { total_cents: params.totalCents, currency: params.currency },
  });

  if (!params.isPremium) return;

  const admin = createAdminClient();
  const { data: links } = await admin
    .from("parent_student_links")
    .select("parent_user_id")
    .eq("student_user_id", params.userId);

  for (const link of links ?? []) {
    await dispatchNotification({
      userId: link.parent_user_id,
      type: "child_payment_completed",
      title: "تم دفع اشتراك Premium",
      body: `تم دفع ${amount} ${params.currency} مقابل ${params.itemTitle}`,
      metadata: { student_id: params.userId, total_cents: params.totalCents, currency: params.currency },
    });
  }
}
