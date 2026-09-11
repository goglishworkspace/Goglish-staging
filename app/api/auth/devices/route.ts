import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { DEVICE_COOKIE_NAME, computeDeviceFingerprint } from "@/lib/services/device-fingerprint";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const deviceCookie = request.cookies.get(DEVICE_COOKIE_NAME)?.value;
  const userAgent = request.headers.get("user-agent");
  const currentFingerprint = deviceCookie ? await computeDeviceFingerprint(deviceCookie, userAgent) : null;

  const { data, error } = await supabase
    .from("devices")
    .select("id, device_fingerprint, user_agent, ip_address, is_active, last_active_at, created_at")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("last_active_at", { ascending: false });

  if (error) return apiError("تعذر جلب الأجهزة", null, 500);

  const devices = (data ?? []).map((d) => ({
    id: d.id,
    user_agent: d.user_agent,
    ip_address: d.ip_address,
    is_active: d.is_active,
    is_current: currentFingerprint ? d.device_fingerprint === currentFingerprint : false,
    last_active_at: d.last_active_at,
    created_at: d.created_at,
  }));

  return apiSuccess(devices, "تم جلب الأجهزة");
}

