import { describe, it, expect, afterAll } from "vitest";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserRegistry } from "./cleanup";
import { createLoggedInStudent } from "./phase2-fixtures";
import {
  createPricedCourse,
  providerPaymentIdFromCheckoutUrl,
  simulateProviderWebhook,
} from "./phase4-fixtures";

async function setUpPendingPayment() {
  const { admin, teacher, courseId } = await createPricedCourse(10000);
  const { client, userId } = await createLoggedInStudent();

  const { json: orderJson } = await client.post<{ id: string }>("/api/orders", {
    item_type: "course",
    item_id: courseId,
  });
  const orderId = orderJson!.data!.id;

  const { json: payJson } = await client.post<{ checkout_url: string }>(`/api/orders/${orderId}/pay`, {
    provider: "paymob",
  });
  const providerPaymentId = providerPaymentIdFromCheckoutUrl(payJson!.data!.checkout_url);

  return { admin, teacher, courseId, client, userId, orderId, providerPaymentId };
}

describe("webhook idempotency", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("processes the same event_id only once", async () => {
    const { admin, teacher, courseId, userId, orderId, providerPaymentId } = await setUpPendingPayment();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    registry.track(userId);

    const eventId = crypto.randomUUID();
    const first = await simulateProviderWebhook("paymob", providerPaymentId, "success", eventId);
    expect(first.status).toBe(200);
    expect((first.json as { alreadyProcessed?: boolean })?.alreadyProcessed).toBeFalsy();

    const second = await simulateProviderWebhook("paymob", providerPaymentId, "success", eventId);
    expect(second.status).toBe(200);
    expect((second.json as { alreadyProcessed?: boolean })?.alreadyProcessed).toBe(true);

    const supabase = createAdminClient();
    const { data: entitlements } = await supabase
      .from("course_entitlements")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", courseId);
    expect(entitlements?.length).toBe(1);

    const { data: invoices } = await supabase.from("invoices").select("id").eq("order_id", orderId);
    expect(invoices?.length).toBe(1);

    const { data: notifications } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "payment_completed");
    expect(notifications?.length).toBe(1);
  });

  it("does not re-fulfil an already-completed payment even under a different event_id", async () => {
    const { admin, teacher, courseId, userId, orderId, providerPaymentId } = await setUpPendingPayment();
    registry.track(admin.userId);
    registry.track(teacher.userId);
    registry.track(userId);

    await simulateProviderWebhook("paymob", providerPaymentId, "success");
    // A second, distinct event for the same payment (e.g. a provider resend
    // with a fresh id, or the hourly reconciliation replaying a stray row).
    const replay = await simulateProviderWebhook("paymob", providerPaymentId, "success");
    expect(replay.status).toBe(200);

    const supabase = createAdminClient();
    const { data: entitlements } = await supabase
      .from("course_entitlements")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", courseId);
    expect(entitlements?.length).toBe(1);

    const { data: invoices } = await supabase.from("invoices").select("id").eq("order_id", orderId);
    expect(invoices?.length).toBe(1);
  });
});
