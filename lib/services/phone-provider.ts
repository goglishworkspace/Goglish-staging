import "server-only";
import fs from "node:fs";

export type PhoneChannel = "whatsapp" | "sms";

export interface PhoneProvider {
  sendCode(phone: string, code: string, channel: PhoneChannel): Promise<void>;
}

/**
 * Phase 1 stand-in: logs the code instead of calling a real WhatsApp/SMS
 * provider. Swap for a Twilio/Vonage/WhatsApp Business implementation later
 * without touching any calling code (Section 5 - Phone Verification).
 */
export class StubPhoneProvider implements PhoneProvider {
  async sendCode(phone: string, code: string, channel: PhoneChannel): Promise<void> {
    // Never log the actual code - this stub's whole log line is only useful
    // for confirming a send was attempted, not for reading the OTP out of
    // server logs.
    console.log(`[StubPhoneProvider] would send ${channel} code to ${phone}`);

    // Test-only side channel: the integration test suite has no other way
    // to read a code back out (it's only ever stored as a SHA-256 hash in
    // the DB). This env var is set exclusively by tests/global-setup.ts on
    // the spawned test server's process - it's never present in a real
    // deployment, and this class can't run in production at all regardless
    // (see getPhoneProvider() below), so this can never reach a real log.
    if (process.env.PHONE_CODE_LOG_PATH) {
      fs.appendFileSync(process.env.PHONE_CODE_LOG_PATH, `${phone}:${code}\n`);
    }
  }
}

export function getPhoneProvider(): PhoneProvider {
  // No real SMS/WhatsApp provider is wired up yet - refuse to silently ship
  // the stub (which can't actually deliver a code to a user) in production
  // rather than letting phone verification appear to work while doing
  // nothing real.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "getPhoneProvider(): no real phone provider configured for production - StubPhoneProvider must not be used outside development/test",
    );
  }
  return new StubPhoneProvider();
}
