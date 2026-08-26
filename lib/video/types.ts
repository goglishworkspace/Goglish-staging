export type VideoProviderName = "bunny" | "youtube";

export type SignedPlaybackUrl = {
  url: string;
  expiresAt: string;
};

/**
 * Common interface both video backends implement (Section 7 - "الكود يُبنى
 * خلف Interface واحد"). Bunny is the protected/paid path (signed, expiring
 * URLs); YouTube is unlisted-preview-only and has no real protection, so it
 * only ever returns an embed URL.
 */
export interface VideoProvider {
  readonly name: VideoProviderName;
  getEmbedUrl(videoId: string): string;
  getSignedPlaybackUrl(videoId: string): Promise<SignedPlaybackUrl | null>;
}
