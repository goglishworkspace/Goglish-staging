import { describe, it, expect, afterAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserRegistry } from "./cleanup";
import { createLoggedInStudent } from "./phase2-fixtures";
import {
  createPricedCourse,
  providerPaymentIdFromCheckoutUrl,
  simulateProviderWebhook,
} from "./phase4-fixtures";

describe("order -> pay -> webhook fulfillment", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("takes a course purchase from pending order through to entitlement, invoice, and notification", async () => {
    const { admin, teacher, courseId } = await createPricedCourse(10000);
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);

    const { status: orderStatus, json: orderJson } = await client.post<{
      id: string;
      status: string;
      total_cents: number;
    }>("/api/orders", { item_type: "course", item_id: courseId });
    expect(orderStatus).toBe(201);
    expect(orderJson?.data?.status).toBe("pending");
    const orderId = orderJson!.data!.id;

    const { status: payStatus, json: payJson } = await client.post<{
      payment_id: string;
      checkout_url: string;
    }>(`/api/orders/${orderId}/pay`, { provider: "paymob" });
    expect(payStatus).toBe(201);
    expect(payJson?.data?.checkout_url).toContain("/checkout/mock/");

    const providerPaymentId = providerPaymentIdFromCheckoutUrl(payJson!.data!.checkout_url);
    const webhookRes = await simulateProviderWebhook("paymob", providerPaymentId, "success");
    expect(webhookRes.status).toBe(200);
    expect((webhookRes.json as { ok: boolean })?.ok).toBe(true);

    const supabase = createAdminClient();

    const { data: payment } = await supabase
      .from("payments")
      .select("status")
      .eq("provider_payment_id", providerPaymentId)
      .single();
    expect(payment?.status).toBe("completed");

    const { data: order } = await supabase.from("orders").select("status").eq("id", orderId).single();
    expect(order?.status).toBe("completed");

    const { data: entitlement } = await supabase
      .from("course_entitlements")
      .select("source, revoked_at")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();
    expect(entitlement?.source).toBe("purchase");
    expect(entitlement?.revoked_at).toBeNull();

    const { data: invoice } = await supabase
      .from("invoices")
      .select("id, storage_path")
      .eq("order_id", orderId)
      .single();
    expect(invoice?.storage_path).toContain(orderId);

    const { status: signedUrlStatus, json: signedUrlJson } = await client.get<{ url: string }>(
      `/api/invoices/${invoice!.id}/signed-url`,
    );
    expect(signedUrlStatus).toBe(200);
    expect(signedUrlJson?.data?.url).toContain("http");

    const { data: notifications } = await supabase
      .from("notifications")
      .select("type")
      .eq("user_id", userId)
      .eq("type", "payment_completed");
    expect(notifications?.length).toBe(1);

    // Section 22 (Phase 12) - the order-status guard itself (not the payment
    // rate limit) is what should reject paying an already-completed order.
    // Checked here, right after the one pay call above, so it stays within
    // the payment rate limit's budget (3/10min/user).
    const { status: repeatPayStatus } = await client.post(`/api/orders/${orderId}/pay`, { provider: "paymob" });
    expect(repeatPayStatus).toBe(409);
  });

  it("cancels the order after 3 failed payment attempts, blocking a 4th (order is no longer pending)", async () => {
    const { admin, teacher, courseId } = await createPricedCourse(5000);
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);

    const { json: orderJson } = await client.post<{ id: string }>("/api/orders", {
      item_type: "course",
      item_id: courseId,
    });
    const orderId = orderJson!.data!.id;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const { json: payJson } = await client.post<{ checkout_url: string }>(`/api/orders/${orderId}/pay`, {
        provider: "paymob",
      });
      const providerPaymentId = providerPaymentIdFromCheckoutUrl(payJson!.data!.checkout_url);
      await simulateProviderWebhook("paymob", providerPaymentId, "failure");
    }

    const supabase = createAdminClient();
    const { data: order } = await supabase.from("orders").select("status").eq("id", orderId).single();
    expect(order?.status).toBe("cancelled");

    // The 3 attempts above already consumed this user's payment rate-limit
    // budget (Section 22 - 3/10min/user, added Phase 12), so the 4th request
    // is now rejected there before it ever reaches the order-status guard -
    // that guard is covered separately above (paying an already-completed
    // order). Both are legitimate rejections of the same request; the rate
    // limiter's 429 is simply reached first.
    const { status: fourthAttemptStatus } = await client.post(`/api/orders/${orderId}/pay`, {
      provider: "paymob",
    });
    expect(fourthAttemptStatus).toBe(429);

    const { data: entitlement } = await supabase
      .from("course_entitlements")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();
    expect(entitlement).toBeNull();
  });
});
