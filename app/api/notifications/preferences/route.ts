import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { zodErrorsToApiErrors } from "@/lib/api/validate";
import { createClient } from "@/lib/supabase/server";
import { updateNotificationPreferencesSchema } from "@/lib/validation/notification-preference.schemas";

const CHANNELS = ["email", "sms", "push", "whatsapp"] as const;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("channel, enabled")
    .eq("user_id", user.id);
  if (error) return apiError("تعذر جلب التفضيلات", null, 500);

  const enabledByChannel = new Map(data?.map((row) => [row.channel, row.enabled]));
  const preferences = Object.fromEntries(CHANNELS.map((channel) => [channel, enabledByChannel.get(channel) ?? true]));

  return apiSuccess({ in_app: true, ...preferences }, "تم جلب التفضيلات");
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("لازم تسجل دخول الأول", null, 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiError("جسم الطلب غير صالح", null, 400);
  const parsed = updateNotificationPreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("بيانات غير صالحة", zodErrorsToApiErrors(parsed.error), 422);
  }

  const rows = CHANNELS.filter((channel) => parsed.data[channel] !== undefined).map((channel) => ({
    user_id: user.id,
    channel,
    enabled: parsed.data[channel]!,
  }));
  if (!rows.length) return apiSuccess(null, "لا يوجد تغييرات");

  const { error } = await supabase.from("notification_preferences").upsert(rows, { onConflict: "user_id,channel" });
  if (error) return apiError("تعذر تحديث التفضيلات", null, 400);

  return apiSuccess(null, "تم تحديث التفضيلات");
}
