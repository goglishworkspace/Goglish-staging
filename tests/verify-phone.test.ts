import { describe, it, expect, afterAll } from "vitest";
import { createTestClient } from "./http-client";
import { validRegisterPayload } from "./fixtures";
import { createUserRegistry } from "./cleanup";
import { confirmUserEmail } from "./admin-helpers";
import { waitForPhoneCode } from "./phone-code-log";

async function registerConfirmAndLogin() {
  const client = createTestClient();
  const payload = validRegisterPayload();
  const { json } = await client.post<{ user_id: string }>("/api/auth/register", payload);
  const userId = json!.data!.user_id;
  await confirmUserEmail(userId);
  await client.post("/api/auth/login", { email: payload.email, password: payload.password });
  return { client, userId };
}

describe("Phone verification", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("requests a code then confirms it", async () => {
    const { client, userId } = await registerConfirmAndLogin();
    registry.track(userId);
    const phone = `01${Math.floor(100000000 + Math.random() * 899999999)}`;

    const requestRes = await client.post("/api/auth/verify-phone/request", { phone });
    expect(requestRes.status).toBe(200);

    const code = await waitForPhoneCode(phone);

    const confirmRes = await client.post("/api/auth/verify-phone/confirm", { code });
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.json?.success).toBe(true);
  });

  it("rejects a wrong code", async () => {
    const { client, userId } = await registerConfirmAndLogin();
    registry.track(userId);
    const phone = `01${Math.floor(100000000 + Math.random() * 899999999)}`;

    await client.post("/api/auth/verify-phone/request", { phone });
    await waitForPhoneCode(phone);

    const confirmRes = await client.post("/api/auth/verify-phone/confirm", { code: "000000" });
    expect(confirmRes.status).toBe(400);
    expect(confirmRes.json?.success).toBe(false);
  });

  it("requires an authenticated session", async () => {
    const client = createTestClient();
    const { status } = await client.post("/api/auth/verify-phone/request", {
      phone: "01012345678",
    });
    expect(status).toBe(401);
  });
});
