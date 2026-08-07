import { describe, it, expect, afterAll, vi } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserRegistry } from "./cleanup";
import { createLoggedInStudent } from "./phase2-fixtures";
import { dispatchNotification } from "@/lib/services/notification-dispatch.service";

describe("dispatchNotification", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("always writes an in-app row, and calls every stub channel when no preferences are set (default: enabled)", async () => {
    const { userId } = await createLoggedInStudent();
    registry.track(userId);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await dispatchNotification({ userId, type: "test_event", title: "عنوان", body: "محتوى" });

    const supabase = createAdminClient();
    const { data: notifications } = await supabase
      .from("notifications")
      .select("type")
      .eq("user_id", userId)
      .eq("type", "test_event");
    expect(notifications?.length).toBe(1);

    const stubCalls = logSpy.mock.calls.filter((args) => String(args[0]).includes("Channel]"));
    expect(stubCalls.length).toBe(4); // email, sms, push, whatsapp

    logSpy.mockRestore();
  });

  it("skips a channel the user explicitly disabled", async () => {
    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);
    await client.patch("/api/notifications/preferences", { email: false, sms: false });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await dispatchNotification({ userId, type: "test_event", title: "عنوان", body: "محتوى" });

    const loggedChannels = logSpy.mock.calls.map((args) => String(args[0]));
    expect(loggedChannels.some((line) => line.includes("StubemailChannel"))).toBe(false);
    expect(loggedChannels.some((line) => line.includes("StubsmsChannel"))).toBe(false);
    expect(loggedChannels.some((line) => line.includes("StubpushChannel"))).toBe(true);
    expect(loggedChannels.some((line) => line.includes("StubwhatsappChannel"))).toBe(true);

    logSpy.mockRestore();
  });
});

describe("GET/PATCH /api/notifications/preferences", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("defaults every channel to enabled and persists PATCH changes", async () => {
    const { client, userId } = await createLoggedInStudent();
    registry.track(userId);

    const before = await client.get<Record<string, boolean>>("/api/notifications/preferences");
    expect(before.status).toBe(200);
    expect(before.json?.data).toEqual({ in_app: true, email: true, sms: true, push: true, whatsapp: true });

    const patchRes = await client.patch("/api/notifications/preferences", { sms: false, push: false });
    expect(patchRes.status).toBe(200);

    const after = await client.get<Record<string, boolean>>("/api/notifications/preferences");
    expect(after.json?.data?.sms).toBe(false);
    expect(after.json?.data?.push).toBe(false);
    expect(after.json?.data?.email).toBe(true);
  });
});
