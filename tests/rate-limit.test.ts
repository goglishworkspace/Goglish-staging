import { describe, it, expect, afterAll } from "vitest";
import { createTestClient } from "./http-client";
import { validRegisterPayload } from "./fixtures";
import { createUserRegistry } from "./cleanup";
import { confirmUserEmail } from "./admin-helpers";

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

  it("blocks a specific account after repeated wrong passwords, but a correct login never counts against the budget", async () => {
    const client = createTestClient();
    const payload = validRegisterPayload();
    const { json } = await client.post<{ user_id: string }>("/api/auth/register", payload);
    const userId = json!.data!.user_id;
    registry.track(userId);
    await confirmUserEmail(userId);

    // Several correct logins in a row must never trip the per-account
    // failure gate - only wrong passwords should count toward it.
    for (let i = 0; i < 3; i += 1) {
      const { status } = await client.post("/api/auth/login", {
        email: payload.email,
        password: payload.password,
      });
      expect(status).toBe(200);
    }

    for (let i = 0; i < 5; i += 1) {
      const { status } = await client.post("/api/auth/login", {
        email: payload.email,
        password: "WrongPassword1!",
      });
      expect(status).toBe(401);
    }

    const sixthWrong = await client.post("/api/auth/login", {
      email: payload.email,
      password: "WrongPassword1!",
    });
    expect(sixthWrong.status).toBe(429);

    // Even the *correct* password is blocked once the account's failure
    // budget is exhausted - the gate runs before signInWithPassword().
    const correctButBlocked = await client.post("/api/auth/login", {
      email: payload.email,
      password: payload.password,
    });
    expect(correctButBlocked.status).toBe(429);
  });

  it("doesn't let one account's wrong-password attempts block a different account from the same IP", async () => {
    const client = createTestClient();

    const victim = validRegisterPayload();
    const { json: victimJson } = await client.post<{ user_id: string }>("/api/auth/register", victim);
    registry.track(victimJson!.data!.user_id);
    await confirmUserEmail(victimJson!.data!.user_id);

    const attacked = validRegisterPayload();
    const { json: attackedJson } = await client.post<{ user_id: string }>("/api/auth/register", attacked);
    registry.track(attackedJson!.data!.user_id);
    await confirmUserEmail(attackedJson!.data!.user_id);

    for (let i = 0; i < 6; i += 1) {
      await client.post("/api/auth/login", { email: attacked.email, password: "WrongPassword1!" });
    }

    const victimLogin = await client.post("/api/auth/login", {
      email: victim.email,
      password: victim.password,
    });
    expect(victimLogin.status).toBe(200);
  });
});
