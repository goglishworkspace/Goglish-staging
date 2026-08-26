import { describe, it, expect, afterAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserRegistry } from "./cleanup";
import { createLoggedInStudent } from "./phase2-fixtures";
import { TEST_BASE_URL } from "./test-env";

const RECONCILE_URL = `${TEST_BASE_URL}/api/payments/reconcile`;

async function callReconcile() {
  const res = await fetch(RECONCILE_URL, {
    method: "POST",
    headers: { "x-reconcile-secret": process.env.RECONCILE_SECRET ?? "" },
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function getMonthlyPlanId(): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin.from("subscription_plans").select("id").eq("kind", "monthly").single();
  return data!.id as string;
}

describe("subscription lifecycle via /api/payments/reconcile", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("rejects reconcile calls without the shared secret", async () => {
    const res = await fetch(RECONCILE_URL, { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("moves an expired active subscription to grace_period, then to expired once the grace period lapses", async () => {
    const { userId } = await createLoggedInStudent();
    registry.track(userId);
    const planId = await getMonthlyPlanId();
    const admin = createAdminClient();

    const { data: sub } = await admin
      .from("user_subscriptions")
      .insert({
        user_id: userId,
        plan_id: planId,
        status: "active",
        current_period_end: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();
    const subId = sub!.id as string;

    const { status } = await callReconcile();
    expect(status).toBe(200);

    const { data: afterGrace } = await admin
      .from("user_subscriptions")
      .select("status, grace_period_ends_at")
      .eq("id", subId)
      .single();
    expect(afterGrace?.status).toBe("grace_period");
    expect(new Date(afterGrace!.grace_period_ends_at as string).getTime()).toBeGreaterThan(Date.now());

    await admin
      .from("user_subscriptions")
      .update({ grace_period_ends_at: new Date(Date.now() - 60 * 1000).toISOString() })
      .eq("id", subId);

    await callReconcile();

    const { data: afterExpiry } = await admin
      .from("user_subscriptions")
      .select("status")
      .eq("id", subId)
      .single();
    expect(afterExpiry?.status).toBe("expired");
  });

  it("leaves a still-current active subscription untouched", async () => {
    const { userId } = await createLoggedInStudent();
    registry.track(userId);
    const planId = await getMonthlyPlanId();
    const admin = createAdminClient();

    const { data: sub } = await admin
      .from("user_subscriptions")
      .insert({
        user_id: userId,
        plan_id: planId,
        status: "active",
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    await callReconcile();

    const { data: afterReconcile } = await admin
      .from("user_subscriptions")
      .select("status")
      .eq("id", sub!.id)
      .single();
    expect(afterReconcile?.status).toBe("active");
  });
});
