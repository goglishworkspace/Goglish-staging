import type { VideoProvider, SignedPlaybackUrl } from "./types";

/** YouTube Unlisted embeds - free previews/trailers only, no real protection
 * (Section 7: no Signed URLs, no Session Expiry, no dynamic Watermark). */
export class YouTubeVideoProvider implements VideoProvider {
  readonly name = "youtube" as const;

  getEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  async getSignedPlaybackUrl(): Promise<SignedPlaybackUrl | null> {
    return null;
  }
}
