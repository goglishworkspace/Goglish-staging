"use client";

import { useFeaturedVideo } from "@/lib/api/queries/homepage";
import { YouTubePlayer } from "@/components/shared/YouTubePlayer";
import { Skeleton } from "@/components/ui/skeleton";
import { extractYouTubeId } from "@/lib/utils";
import { Reveal } from "./Reveal";
import { SectionEyebrow } from "./SectionEyebrow";

export function FeaturedVideoSection() {
  const { data, isLoading } = useFeaturedVideo();
  const videoId = data?.video_url ? extractYouTubeId(data.video_url) : null;

  // Nothing set by the admin yet - skip the section instead of showing an
  // empty block to visitors.
  if (!isLoading && !videoId) return null;

  return (
    <section className="w-full px-4 py-16 sm:px-6 lg:px-8">
      <Reveal className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          <SectionEyebrow>نظرة سريعة</SectionEyebrow>
          <h2 className="text-h2 text-secondary dark:text-white">اتفرج قبل ما تبدأ</h2>
        </div>
        {isLoading ? (
          <Skeleton className="aspect-video w-full rounded-xl" />
        ) : (
          <div className="overflow-hidden rounded-2xl ring-1 ring-border">
            <YouTubePlayer videoId={videoId!} title="فيديو تعريفي عن Goglish" />
          </div>
        )}
      </Reveal>
    </section>
  );
}
