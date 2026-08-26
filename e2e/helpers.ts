import { createClient } from "@supabase/supabase-js";

/**
 * Direct supabase-js admin client, bypassing lib/supabase/admin.ts on
 * purpose - that file does `import "server-only"`, which throws when
 * imported outside a Next.js/webpack bundling context (Playwright specs run
 * under plain Node, same reason vitest.config.ts has to alias server-only
 * to a no-op for tests/).
 */
export function e2eAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

let counter = 0;
export function uniqueEmail(): string {
  counter += 1;
  return `e2e-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/** Mirrors tests/fixtures.ts's national-id builder (age 16, syntactically valid). */
export function buildNationalId(age: number): string {
  const now = new Date();
  const birthYear = now.getUTCFullYear() - age;
  const century = birthYear >= 2000 ? "3" : "2";
  const yy = String(birthYear % 100).padStart(2, "0");
  const sequence = String(Math.floor(Math.random() * 9999)).padStart(4, "0");
  const checkDigit = String(Math.floor(Math.random() * 10));
  return `${century}${yy}0101${"01"}${sequence}${checkDigit}`;
}

export const E2E_PASSWORD = "Str0ngPass!";

export function validRegisterFields() {
  return {
    firstName: "طالب",
    lastName: "تجريبي",
    email: uniqueEmail(),
    nationalId: buildNationalId(16),
    password: E2E_PASSWORD,
  };
}

/** Simulates clicking the confirmation email link, without needing to parse
 * Inbucket - same trick as tests/admin-helpers.ts's confirmUserEmail. */
export async function confirmEmail(userId: string) {
  const admin = e2eAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  if (error) throw error;
}

/** Register's rate limit (3/hour/IP) is shared with the Vitest suite against
 * the same local Supabase instance - clear it so E2E registration attempts
 * don't get 429'd by leftover counters from an earlier run. */
export async function clearRegisterRateLimit() {
  const admin = e2eAdminClient();
  await admin.from("rate_limit_counters").delete().neq("key", "");
}

const MAILPIT_URL = "http://127.0.0.1:54324";

/** The self-service register flow (app/(auth)/register/page.tsx) calls
 * supabase.auth.signUp() directly and relies on Supabase's own PKCE
 * confirmation email - there's no admin-shortcut that also exercises
 * app/auth/callback/route.ts's profile-completion + role-based redirect, so
 * this fetches the real link from the local Mailpit instance instead
 * (same technique used for manual QA of this flow). Polls briefly since the
 * email is sent asynchronously by GoTrue right after signUp() resolves. */
export async function fetchConfirmationLink(email: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const searchRes = await fetch(
      `${MAILPIT_URL}/api/v1/messages?query=${encodeURIComponent(`to:${email}`)}&limit=1`,
    );
    const search = (await searchRes.json()) as { messages: Array<{ ID: string }> };
    if (search.messages?.length) {
      const messageRes = await fetch(`${MAILPIT_URL}/api/v1/message/${search.messages[0].ID}`);
      const message = (await messageRes.json()) as { Text: string };
      const match = message.Text.match(/\( (http:\/\/127\.0\.0\.1:54321\/auth\/v1\/verify\?[^\s)]+) \)/);
      if (match) return match[1];
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No confirmation email found for ${email} within the poll window`);
}
