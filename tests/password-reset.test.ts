import { describe, it, expect, afterAll } from "vitest";
import { createTestClient } from "./http-client";
import { validRegisterPayload, uniqueEmail } from "./fixtures";
import { createUserRegistry } from "./cleanup";

describe("Forgot / reset password", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("forgot-password succeeds for a registered email", async () => {
    const client = createTestClient();
    const payload = validRegisterPayload();
    const { json } = await client.post<{ user_id: string }>("/api/auth/register", payload);
    if (json?.data?.user_id) registry.track(json.data.user_id);

    const { status, json: forgotJson } = await client.post("/api/auth/forgot-password", {
      email: payload.email,
    });

    expect(status).toBe(200);
    expect(forgotJson?.success).toBe(true);
  });

  it("forgot-password also succeeds (silently) for an unregistered email, to avoid leaking which emails exist", async () => {
    const client = createTestClient();
    const { status, json } = await client.post("/api/auth/forgot-password", {
      email: uniqueEmail(),
    });

    expect(status).toBe(200);
    expect(json?.success).toBe(true);
  });

  // The full "click the email link then set a new password" path needs a real
  // recovery session (established client-side from the emailed link) and is
  // covered manually / via E2E; here we only verify the endpoint rejects
  // requests without one.
  it("reset-password rejects when there is no active recovery session", async () => {
    const client = createTestClient();
    const { status, json } = await client.post("/api/auth/reset-password", {
      password: "NewStrongPass1!",
      confirm_password: "NewStrongPass1!",
    });

    expect(status).toBe(401);
    expect(json?.success).toBe(false);
  });
});
