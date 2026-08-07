// Pure, edge-safe helpers (Web Crypto only - no "node:crypto" or
// "next/headers") - importable from proxy.ts's edge middleware, unlike the
// rest of device.service.ts.
export const DEVICE_COOKIE_NAME = "goglish_device_id";

export async function computeDeviceFingerprint(deviceId: string, userAgent: string | null): Promise<string> {
  const data = new TextEncoder().encode(`${deviceId}:${userAgent ?? "unknown"}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
