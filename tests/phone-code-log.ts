import fs from "node:fs";
import path from "node:path";

export const PHONE_CODE_LOG_PATH = path.resolve(__dirname, ".tmp-phone-codes.log");

export function resetPhoneCodeLog() {
  fs.writeFileSync(PHONE_CODE_LOG_PATH, "");
}

/** Polls the log file (written by global-setup from the Next dev server's
 * stdout) for the most recent StubPhoneProvider code sent to `phone`. */
export async function waitForPhoneCode(phone: string, timeoutMs = 10_000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(PHONE_CODE_LOG_PATH)) {
      const lines = fs.readFileSync(PHONE_CODE_LOG_PATH, "utf8").trim().split("\n");
      for (let i = lines.length - 1; i >= 0; i -= 1) {
        const [linePhone, code] = lines[i].split(":");
        if (linePhone === phone && code) return code;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Timed out waiting for a StubPhoneProvider code sent to ${phone}`);
}
