import { config as loadEnv } from "dotenv";
import { beforeEach } from "vitest";

loadEnv({ path: ".env.local", quiet: true });

// Rate limiting is IP-scoped and shared across every test file, which would
// otherwise make unrelated functional tests fail once enough requests pile
// up. Give every test a clean rate-limit slate; rate-limit.test.ts is the
// only file that deliberately exceeds a limit within a single test.
beforeEach(async () => {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  await admin.from("rate_limit_counters").delete().neq("key", "");
});
