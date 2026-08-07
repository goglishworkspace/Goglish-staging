import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { getLessonPlayback } from "@/lib/services/lesson-playback.service";
import { getOrCreateDeviceId, computeDeviceFingerprint, enforceSingleActiveStream } from "@/lib/services/device.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const result = await getLessonPlayback(supabase, id, user?.id ?? null);

  // Only the actual protected-stream path needs the 1-active-stream-per-device
  // check (Section 22) - previews (youtube) and error results never require
  // this, so there's nothing to guard there.
  if (result.kind === "youtube_protected" && user) {
    const deviceId = await getOrCreateDeviceId();
    const fingerprint = await computeDeviceFingerprint(deviceId, request.headers.get("user-agent"));
    const streamResult = await enforceSingleActiveStream(user.id, fingerprint, id);
    if (!streamResult.allowed) {
      return apiError("جهازك بيشغّل درس تاني دلوقتي، وقفه الأول عشان تشاهد ده", null, 409);
    }
  }

  switch (result.kind) {
    case "not_found":
      return apiError("الدرس غير موجود", null, 404);
    case "login_required":
      return apiError("لازم تسجل دخول لمشاهدة الدرس", null, 401);
    case "purchase_required":
      return apiError("لازم تشتري الكورس ده الأول عشان تشاهد الدرس", null, 402);
    case "no_video":
      return apiError("مفيش فيديو متاح للدرس ده لسه", null, 404);
    case "youtube":
      return apiSuccess({ provider: "youtube", embedUrl: result.embedUrl, videoId: result.videoId }, "تم تجهيز المعاينة");
    case "youtube_protected":
      return apiSuccess(
        { provider: "youtube", videoId: result.videoId, watermark: result.watermark },
        "تم تجهيز رابط المشاهدة",
      );
  }
}
