"use client";

import { useFeaturedVideo } from "@/lib/api/queries/homepage";
import { YouTubePlayer } from "@/components/shared/YouTubePlayer";
import { Skeleton } from "@/components/ui/skeleton";
import { extractYouTubeId } from "@/lib/utils";

export function FeaturedVideoSection() {
  const { data, isLoading } = useFeaturedVideo();
  const videoId = data?.video_url ? extractYouTubeId(data.video_url) : null;

  // Nothing set by the admin yet - skip the section instead of showing an
  // empty block to visitors.
  if (!isLoading && !videoId) return null;

  return (
    <section className="w-full px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        {isLoading ? (
          <Skeleton className="aspect-video w-full rounded-xl" />
        ) : (
          <YouTubePlayer videoId={videoId!} title="فيديو تعريفي عن Goglish" />
        )}
      </div>
    </section>
  );
}
