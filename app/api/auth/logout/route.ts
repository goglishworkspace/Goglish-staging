import { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import {
  getOrCreateDeviceId,
  computeDeviceFingerprint,
  touchDevice,
} from "@/lib/services/device.service";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const userAgent = request.headers.get("user-agent");
    const deviceId = await getOrCreateDeviceId();
    const fingerprint = await computeDeviceFingerprint(deviceId, userAgent);
    await touchDevice(user.id, fingerprint);
  }

  // scope: "local" - "تسجيل الخروج" here should only end this device's own
  // session, not (the signOut() default) every device this user is logged
  // into elsewhere.
  await supabase.auth.signOut({ scope: "local" });

  return apiSuccess(null, "تم تسجيل الخروج");
}
