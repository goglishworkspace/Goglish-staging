import { describe, it, expect, afterAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserRegistry } from "./cleanup";
import { createLoggedInStudent, createPublishedLesson } from "./phase2-fixtures";
import {
  createPricedCourse,
  providerPaymentIdFromCheckoutUrl,
  simulateProviderWebhook,
} from "./phase4-fixtures";

describe("course access policy on lesson playback", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("blocks a logged-in student without an entitlement, then unblocks after a real purchase", async () => {
    const { admin, teacher, courseId, lessonId } = await createPricedCourse(10000, {
      youtube_video_id: "test-video-guid",
    });
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);

    const blocked = await client.get(`/api/lessons/${lessonId}/playback`);
    expect(blocked.status).toBe(402);

    const { json: orderJson } = await client.post<{ id: string }>("/api/orders", {
      item_type: "course",
      item_id: courseId,
    });
    const { json: payJson } = await client.post<{ checkout_url: string }>(
      `/api/orders/${orderJson!.data!.id}/pay`,
      { provider: "paymob" },
    );
    const providerPaymentId = providerPaymentIdFromCheckoutUrl(payJson!.data!.checkout_url);
    await simulateProviderWebhook("paymob", providerPaymentId, "success");

    const { status, json } = await client.get<{ provider: string; url: string }>(
      `/api/lessons/${lessonId}/playback`,
    );
    expect(status).toBe(200);
    expect(json?.data?.provider).toBe("youtube");
  });

  it("grants access to any published course while an active subscription lasts", async () => {
    const { admin, teacher, lessonId } = await createPublishedLesson({
      youtube_video_id: "test-video-guid-2",
    });
    registry.track(admin.userId);
    registry.track(teacher.userId);
    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);

    const blocked = await client.get(`/api/lessons/${lessonId}/playback`);
    expect(blocked.status).toBe(402);

    const supabase = createAdminClient();
    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("id")
      .eq("kind", "yearly")
      .single();
    await supabase.from("user_subscriptions").insert({
      user_id: userId,
      plan_id: plan!.id,
      status: "active",
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const { status, json } = await client.get<{ provider: string }>(`/api/lessons/${lessonId}/playback`);
    expect(status).toBe(200);
    expect(json?.data?.provider).toBe("youtube");
  });
});
