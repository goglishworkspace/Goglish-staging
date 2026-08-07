import { describe, it, expect, afterAll } from "vitest";
import { createTestClient } from "./http-client";
import { validRegisterPayload } from "./fixtures";
import { createUserRegistry } from "./cleanup";
import { confirmUserEmail } from "./admin-helpers";
import { createAdminClient } from "@/lib/supabase/admin";

async function registerAndConfirm(registry: ReturnType<typeof createUserRegistry>) {
  const client = createTestClient();
  const payload = validRegisterPayload();
  const { json } = await client.post<{ user_id: string }>("/api/auth/register", payload);
  const userId = json!.data!.user_id;
  registry.track(userId);
  await confirmUserEmail(userId);
  return { email: payload.email, password: payload.password, userId };
}

describe("Device management", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("lists the device created at login, then removing a *different* device drops it from the list without signing the caller out", async () => {
    const { email, password, userId } = await registerAndConfirm(registry);

    const deviceA = createTestClient();
    await deviceA.post("/api/auth/login", { email, password });
    const admin = createAdminClient();
    const { data: afterA } = await admin.from("devices").select("id").eq("user_id", userId);
    const deviceARowId = afterA![0].id as string;

    const deviceB = createTestClient();
    await deviceB.post("/api/auth/login", { email, password });

    const list = await deviceA.get<Array<{ id: string }>>("/api/auth/devices");
    expect(list.status).toBe(200);
    expect(list.json?.data?.length).toBe(2);

    const deviceBRowId = list.json!.data!.find((d) => d.id !== deviceARowId)!.id;
    const del = await deviceA.delete(`/api/auth/devices/${deviceBRowId}`);
    expect(del.status).toBe(200);

    // Only device B's row is gone - device A's own session is untouched, so
    // it's still authenticated and sees itself as the one remaining device.
    const listAfter = await deviceA.get<Array<{ id: string }>>("/api/auth/devices");
    expect(listAfter.status).toBe(200);
    expect(listAfter.json?.data?.length).toBe(1);
    expect(listAfter.json?.data?.[0].id).toBe(deviceARowId);
  });

  it("removing your own currently-active device signs you out on the very next request (Section 5 - the actual fix)", async () => {
    const { email, password } = await registerAndConfirm(registry);

    const client = createTestClient();
    await client.post("/api/auth/login", { email, password });
    const list = await client.get<Array<{ id: string }>>("/api/auth/devices");
    const ownRowId = list.json!.data![0].id;

    const del = await client.delete(`/api/auth/devices/${ownRowId}`);
    expect(del.status).toBe(200);

    // Same cookies, next request - middleware notices this device's own row
    // is now inactive and signs the session out server-side.
    const listAfter = await client.get("/api/auth/devices");
    expect(listAfter.status).toBe(401);

    const admin = createAdminClient();
    const { data: row } = await admin.from("devices").select("is_active").eq("id", ownRowId).single();
    expect(row?.is_active).toBe(false);
  });

  it("does not let one user see or delete another user's device (RLS)", async () => {
    const userA = await registerAndConfirm(registry);
    const userB = await registerAndConfirm(registry);
    const clientA = createTestClient();
    const clientB = createTestClient();
    await clientA.post("/api/auth/login", { email: userA.email, password: userA.password });
    await clientB.post("/api/auth/login", { email: userB.email, password: userB.password });

    const listA = await clientA.get<Array<{ id: string }>>("/api/auth/devices");
    const deviceIdA = listA.json!.data![0].id;

    const crossDelete = await clientB.delete(`/api/auth/devices/${deviceIdA}`);
    expect(crossDelete.status).toBe(404);

    const listAAfter = await clientA.get<Array<{ id: string }>>("/api/auth/devices");
    expect(listAAfter.json?.data?.length).toBe(1);
  });
});
