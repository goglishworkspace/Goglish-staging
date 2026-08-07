import { spawn, execSync, type ChildProcess } from "node:child_process";
import { config as loadEnv } from "dotenv";
import { TEST_BASE_URL, TEST_PORT } from "./test-env";
import { PHONE_CODE_LOG_PATH, resetPhoneCodeLog } from "./phone-code-log";

async function waitForUrl(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // server not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url} to become available`);
}

/** Best-effort cleanup of a stray `next dev` left over from a previous run
 * that failed to shut down (a plain child.kill() only signals the shell
 * wrapper npx spawns on Windows, not the actual next-server grandchild). */
function killWhatIsListeningOn(port: number) {
  if (process.platform !== "win32") return;
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const pids = new Set(
      output
        .split("\n")
        // Only real listeners - TIME_WAIT rows report a bogus PID of 0/4 for
        // kernel-held sockets, which taskkill can't touch anyway.
        .filter((line) => line.includes("LISTENING"))
        .map((line) => line.trim().split(/\s+/).pop())
        .filter((pid): pid is string => !!pid && /^\d+$/.test(pid) && Number(pid) > 4),
    );
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /T /F`);
      } catch {
        // already gone
      }
    }
  } catch {
    // nothing listening on that port
  }
}

function killProcessTree(pid: number | undefined) {
  if (!pid) return;
  if (process.platform === "win32") {
    try {
      execSync(`taskkill /PID ${pid} /T /F`);
    } catch {
      // already exited
    }
  } else {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      // already exited
    }
  }
}

export default async function globalSetup() {
  loadEnv({ path: ".env.local", quiet: true });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing .env.local (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). " +
        "Run `npx supabase start` and copy the printed values into .env.local first.",
    );
  }

  try {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`);
  } catch {
    throw new Error(
      "Local Supabase isn't reachable. Run `npx supabase start` before `npm test`.",
    );
  }

  resetPhoneCodeLog();
  killWhatIsListeningOn(TEST_PORT);

  // StubPhoneProvider writes the code directly to this path (never to
  // stdout/logs - see lib/services/phone-provider.ts) when this env var is
  // set, so the test suite has a way to read a code it can otherwise only
  // ever see as a SHA-256 hash in the DB.
  const nextProcess: ChildProcess = spawn(`npx next dev -p ${TEST_PORT}`, {
    cwd: process.cwd(),
    env: { ...process.env, PHONE_CODE_LOG_PATH },
    stdio: "pipe",
    shell: true,
  });

  nextProcess.stderr?.on("data", (chunk) => {
    process.stderr.write(`[next dev:test] ${chunk}`);
  });

  // Must keep draining stdout even though nothing here needs to parse it
  // anymore - with stdio:"pipe" the OS pipe buffer fills up if nobody reads
  // it, and once full the child process blocks on its next stdout write
  // (e.g. Next's own request-logging), freezing the whole dev server. This
  // bit us directly: removing this handler (when the phone-code parsing
  // that used to live here moved to the file-based side channel above)
  // caused every long full-suite run to hang solid partway through.
  nextProcess.stdout?.on("data", (chunk) => {
    process.stdout.write(`[next dev:test] ${chunk}`);
  });

  await waitForUrl(TEST_BASE_URL, 60_000);

  return async () => {
    killProcessTree(nextProcess.pid);
    killWhatIsListeningOn(TEST_PORT);
  };
}
