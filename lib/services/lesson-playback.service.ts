import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getVideoProvider } from "@/lib/video";
import { hasCourseAccess } from "./entitlement.service";
import { decryptNationalId } from "./national-id.service";

export type LessonPlaybackResult =
  | { kind: "youtube"; embedUrl: string; videoId: string }
  | {
      kind: "youtube_protected";
      videoId: string;
      watermark: { nationalId: string | null; logoText: string };
    }
  | { kind: "not_found" }
  | { kind: "login_required" }
  | { kind: "purchase_required" }
  | { kind: "no_video" };

/**
 * Shared by the /api/lessons/[id]/playback route and the lesson watch page
 * Server Component, so the video-provider selection logic only lives once.
 * RLS on `lessons` already hides non-published lessons from anyone but their
 * owner/team/admin, so a null lesson here just means "not visible to you".
 *
 * Protected lesson video is an unlisted YouTube upload (youtube_video_id) -
 * not Bunny Stream. There's no server-side signed/expiring URL the way
 * Bunny had, so the purchase gate + the no-native-controls YouTubePlayer +
 * the personalized watermark below are the actual protection this content
 * gets; an unlisted link is inherently shareable by anyone who gets it.
 */
export async function getLessonPlayback(
  supabase: SupabaseClient,
  lessonId: string,
  userId: string | null,
): Promise<LessonPlaybackResult> {
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, is_preview, youtube_video_id, youtube_preview_video_id, modules(course_id)")
    .eq("id", lessonId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!lesson) return { kind: "not_found" };

  if (lesson.is_preview && lesson.youtube_preview_video_id) {
    const provider = getVideoProvider("youtube");
    return {
      kind: "youtube",
      embedUrl: provider.getEmbedUrl(lesson.youtube_preview_video_id),
      videoId: lesson.youtube_preview_video_id,
    };
  }

  // Protected content requires a logged-in student who has actually paid for
  // it (Section 9 - Phase 4): a permanent per-course entitlement, or an
  // active/grace-period subscription.
  if (!userId) return { kind: "login_required" };
  if (!lesson.youtube_video_id) return { kind: "no_video" };

  const modules = lesson.modules as { course_id: string }[] | { course_id: string } | null;
  const courseId = Array.isArray(modules) ? modules[0]?.course_id : modules?.course_id;
  const hasAccess = courseId ? await hasCourseAccess(supabase, userId, courseId) : false;
  if (!hasAccess) return { kind: "purchase_required" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("national_id_encrypted")
    .eq("id", userId)
    .maybeSingle();

  // Full, unmasked ID burned into the watermark on purpose (Section: video
  // piracy deterrent) - a masked "3010****4021" only narrows a leak down to
  // a handful of students, the full ID identifies exactly who leaked it.
  let nationalId: string | null = null;
  if (profile?.national_id_encrypted) {
    try {
      nationalId = decryptNationalId(profile.national_id_encrypted);
    } catch {
      nationalId = null;
    }
  }

  return {
    kind: "youtube_protected",
    videoId: lesson.youtube_video_id,
    watermark: { nationalId, logoText: "Goglish" },
  };
}
