import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// Playwright's test runner is a separate plain-Node process from `next dev`
// (started below via webServer) - it needs its own copy of .env.local to
// reach the local Supabase instance directly for fixture setup (e2e/helpers.ts).
dotenv.config({ path: ".env.local" });

/**
 * Section 36 - E2E (Playwright). A small critical-path smoke suite, not
 * exhaustive coverage - the Vitest integration suite already covers every
 * API route in depth; this layer exists to catch "the actual browser can't
 * complete the golden path" regressions the API tests can't see (hydration
 * errors, broken client-side routing, a button whose onClick never fires).
 *
 * Runs against the app on :3000 - reuses an already-running `npm run dev`
 * if there is one (matches how this repo's manual browser verification
 * already works), otherwise starts one itself. Needs local Supabase running
 * first (`npx supabase start`), same prerequisite as `npm test`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
