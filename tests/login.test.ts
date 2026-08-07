import { describe, it, expect, afterAll } from "vitest";
import { createTestClient } from "./http-client";
import { validRegisterPayload } from "./fixtures";
import { createUserRegistry } from "./cleanup";
import { confirmUserEmail } from "./admin-helpers";

async function registerAndConfirm(registry: ReturnType<typeof createUserRegistry>) {
  const client = createTestClient();
  const payload = validRegisterPayload();
  const { json } = await client.post<{ user_id: string }>("/api/auth/register", payload);
  const userId = json!.data!.user_id;
  registry.track(userId);
  await confirmUserEmail(userId);
  return { email: payload.email, password: payload.password, userId };
}

describe("POST /api/auth/login", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("logs in with correct credentials", async () => {
    const { email, password } = await registerAndConfirm(registry);
    const client = createTestClient();

    const { status, json } = await client.post("/api/auth/login", { email, password });

    expect(status).toBe(200);
    expect(json?.success).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const { email } = await registerAndConfirm(registry);
    const client = createTestClient();

    const { status, json } = await client.post("/api/auth/login", {
      email,
      password: "WrongPassword1!",
    });

    expect(status).toBe(401);
    expect(json?.success).toBe(false);
  });

  it("asks for confirmation before kicking the oldest device on a third login, then only actually kicks it once confirmed", async () => {
    const { email, password } = await registerAndConfirm(registry);

    const deviceA = createTestClient();
    const deviceB = createTestClient();
    const deviceC = createTestClient();

    const resA = await deviceA.post("/api/auth/login", { email, password });
    const resB = await deviceB.post("/api/auth/login", { email, password });
    const resC = await deviceC.post<{ status: string; oldest_device: { user_agent: string | null } }>(
      "/api/auth/login",
      { email, password },
    );

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    expect(resC.status).toBe(200);
    expect(resC.json?.data?.status).toBe("device_limit_confirm");
    expect(resC.json?.data?.oldest_device).toBeTruthy();

    // Not confirmed yet - device C shouldn't be signed in at all (login.ts
    // signs the just-created session back out when it hits the limit).
    const devicesAfterFirstAttempt = await deviceA.get<Array<{ id: string }>>("/api/auth/devices");
    expect(devicesAfterFirstAttempt.json?.data?.length).toBe(2);

    const resCConfirmed = await deviceC.post<{ status: string }>("/api/auth/login", {
      email,
      password,
      confirm_kick: true,
    });
    expect(resCConfirmed.status).toBe(200);
    expect(resCConfirmed.json?.data?.status).toBe("ok");

    const devicesAfterKick = await deviceC.get<Array<{ id: string }>>("/api/auth/devices");
    expect(devicesAfterKick.json?.data?.length).toBe(2);
  });
});
