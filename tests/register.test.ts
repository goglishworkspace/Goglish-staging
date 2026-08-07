import { describe, it, expect, afterAll } from "vitest";
import { createTestClient } from "./http-client";
import { validRegisterPayload, buildNationalId, uniqueEmail } from "./fixtures";
import { createUserRegistry } from "./cleanup";

describe("POST /api/auth/register", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("creates a new account with valid data", async () => {
    const client = createTestClient();
    const payload = validRegisterPayload();

    const { status, json } = await client.post<{ user_id: string }>(
      "/api/auth/register",
      payload,
    );

    expect(status).toBe(201);
    expect(json?.success).toBe(true);
    expect(json?.data?.user_id).toBeTruthy();
    // The raw/masked national id should never be echoed back.
    expect(JSON.stringify(json)).not.toContain(payload.national_id);

    if (json?.data?.user_id) registry.track(json.data.user_id);
  });

  it("rejects a duplicate email", async () => {
    const client = createTestClient();
    const payload = validRegisterPayload();

    const first = await client.post<{ user_id: string }>("/api/auth/register", payload);
    if (first.json?.data?.user_id) registry.track(first.json.data.user_id);

    const second = await client.post("/api/auth/register", {
      ...payload,
      national_id: buildNationalId(16),
    });

    expect(second.status).toBeGreaterThanOrEqual(400);
    expect(second.json?.success).toBe(false);
  });

  it("rejects an invalid national id format", async () => {
    const client = createTestClient();
    const { status, json } = await client.post(
      "/api/auth/register",
      validRegisterPayload({ national_id: "12345" }),
    );

    expect(status).toBe(422);
    expect(json?.success).toBe(false);
  });

  it("rejects a student younger than 14", async () => {
    const client = createTestClient();
    const { status, json } = await client.post(
      "/api/auth/register",
      validRegisterPayload({ national_id: buildNationalId(10), email: uniqueEmail() }),
    );

    expect(status).toBe(422);
    expect(json?.success).toBe(false);
    expect(json?.errors?.national_id?.[0]).toBeTruthy();
  });

  it("rejects a student older than 18", async () => {
    const client = createTestClient();
    const { status, json } = await client.post(
      "/api/auth/register",
      validRegisterPayload({ national_id: buildNationalId(25), email: uniqueEmail() }),
    );

    expect(status).toBe(422);
    expect(json?.success).toBe(false);
  });

  it("rejects mismatched password confirmation", async () => {
    const client = createTestClient();
    const payload = validRegisterPayload({ confirm_password: "SomethingElse1!" });

    const { status, json } = await client.post("/api/auth/register", payload);

    expect(status).toBe(422);
    expect(json?.errors?.confirm_password?.[0]).toBeTruthy();
  });
});
