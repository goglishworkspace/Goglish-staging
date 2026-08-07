import { apiSuccess } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";

// Deliberately public (platform_settings itself is staff-only via RLS,
// so this exposes just the one key visitors need) - same pattern as
// /api/subjects and /api/teachers reading through the admin client.
export async function GET() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("platform_settings")
    .select("value")
    .eq("key", "homepage.featured_video_url")
    .maybeSingle();

  const videoUrl = typeof data?.value === "string" ? data.value : null;
  return apiSuccess({ video_url: videoUrl }, "تم جلب الفيديو");
}
