import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { completeProfileSchema } from "@/lib/validation/auth.schemas";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { apiSuccess, apiError } from "@/lib/api/response";
import { linkChildToParent } from "@/lib/services/parent-portal.service";
import { getClientIp } from "@/lib/services/rate-limit.service";
import {
  getOrCreateDeviceId,
  computeDeviceFingerprint,
  enforceDeviceLimit,
} from "@/lib/services/device.service";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return apiError("يجب تسجيل الدخول أولاً", null, 401);
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return apiError("بيانات الطلب غير صالحة", null, 400);
  }

  const parsed = completeProfileSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const { role_type, first_name, last_name, phone, grade, child_phone } = parsed.data;
  const admin = createAdminClient();

  // 1. Update profiles table - try direct update first as the profile stub already exists
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      first_name,
      last_name,
      phone,
      role_type,
      grade: role_type === "student" ? (grade ?? null) : null,
      self_registration_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("Profiles update failed, trying complete_self_registration RPC:", updateError);
    // Fallback: use database RPC function
    const { error: rpcError } = await admin.rpc("complete_self_registration", {
      p_user_id: user.id,
      p_role_type: role_type,
      p_first_name: first_name,
      p_last_name: last_name,
      p_phone: phone,
      p_grade: role_type === "student" ? (grade ?? null) : null,
      p_child_phone: role_type === "parent" ? (child_phone || null) : null,
    });

    if (rpcError) {
      console.error("complete_self_registration RPC error:", rpcError);
      return apiError(`تعذر حفظ البيانات: ${updateError.message || rpcError.message}`, null, 500);
    }
  }

  // 2. Sync user_metadata in Supabase Auth so session reflects full profile
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      first_name,
      last_name,
      phone,
      role_type,
      grade: role_type === "student" ? grade : undefined,
    },
  }).catch((err) => console.error("Failed to sync auth user_metadata:", err));

  // 3. Assign role in role_user
  const { data: roleRow } = await admin
    .from("roles")
    .select("id")
    .eq("name", role_type)
    .maybeSingle();

  if (roleRow) {
    await admin
      .from("role_user")
      .upsert(
        {
          user_id: user.id,
          role_id: roleRow.id,
        },
        { onConflict: "user_id,role_id" },
      );
  }

  // 4. Link child if parent provided a child phone
  if (role_type === "parent" && child_phone) {
    try {
      await linkChildToParent(user.id, child_phone);
    } catch (err) {
      console.error("Failed to auto-link child for parent:", err);
    }
  }

  // 5. Register active device
  try {
    const ip = getClientIp(request);
    const userAgent = request.headers.get("user-agent");
    const deviceId = await getOrCreateDeviceId();
    const fingerprint = await computeDeviceFingerprint(deviceId, userAgent);
    await enforceDeviceLimit(user.id, fingerprint, userAgent, ip, true);
  } catch (err) {
    console.error("Device registration error on complete-profile", err);
  }

  const destination = role_type === "student" ? "/student/dashboard" : "/parent/dashboard";
  return apiSuccess({ destination }, "تم حفظ بيانات الحساب بنجاح", 200);
}
