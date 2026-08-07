import { describe, it, expect, afterAll } from "vitest";
import { createTestClient } from "./http-client";
import { validRegisterPayload } from "./fixtures";
import { createUserRegistry } from "./cleanup";

describe("Rate limiting", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("blocks register requests past the 3/hour/IP limit", async () => {
    const client = createTestClient();

    for (let i = 0; i < 3; i += 1) {
      const { status, json } = await client.post<{ user_id: string }>(
        "/api/auth/register",
        validRegisterPayload(),
      );
      expect(status).toBe(201);
      if (json?.data?.user_id) registry.track(json.data.user_id);
    }

    const fourth = await client.post("/api/auth/register", validRegisterPayload());
    expect(fourth.status).toBe(429);
    expect(fourth.json?.success).toBe(false);
  });
});
