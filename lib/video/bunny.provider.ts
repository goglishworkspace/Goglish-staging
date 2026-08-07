import "server-only";
import crypto from "node:crypto";
import type { VideoProvider, SignedPlaybackUrl } from "./types";

const SIGNED_URL_TTL_SECONDS = 15 * 60;

/**
 * Serves Bunny Stream's direct HLS playlist (not the iframe.mediadelivery.net
 * hosted embed) so lessons can play through our own custom VideoPlayer
 * component (VideoPlayer.tsx) with fully custom controls - skip ±10s, speed,
 * a real scrubber, fullscreen - instead of whatever UI Bunny's own embedded
 * player happens to ship. The `vz-{libraryId}.b-cdn.net` pull-zone hostname
 * is Bunny's default auto-provisioned CDN domain for a Stream library (used
 * unless a custom CDN hostname was configured for it in the dashboard).
 *
 * IMPORTANT - NOT verified against a real Bunny account: this project has no
 * live Bunny Stream library to test against (confirmed with the user - no
 * real videos are uploaded yet), and docs.bunny.net was unreachable while
 * this was written. Two things specifically need confirming against
 * https://docs.bunny.net (or a real test upload) before this goes live:
 *   1. That `vz-{libraryId}.b-cdn.net/{videoId}/playlist.m3u8` is actually
 *      this library's pull zone hostname (it may have a custom CDN hostname
 *      configured instead, in which case that hostname replaces this one).
 *   2. Bunny's direct-CDN Token Authentication signing formula, which is
 *      typically `sha256(security_key + url_path + expires)` base64url-
 *      encoded, NOT the plain-hex `sha256(key + videoId + expires)` used
 *      below - kept here only because the iframe-embed token used the
 *      latter and this hasn't been re-verified for the direct-CDN case.
 * Only this class needs to change if either detail differs - everything
 * else consumes the VideoProvider interface.
 */
export class BunnyVideoProvider implements VideoProvider {
  readonly name = "bunny" as const;

  private get libraryId(): string {
    const id = process.env.BUNNY_LIBRARY_ID;
    if (!id) throw new Error("BUNNY_LIBRARY_ID is not configured");
    return id;
  }

  private get tokenAuthKey(): string {
    const key = process.env.BUNNY_TOKEN_AUTH_KEY;
    if (!key) throw new Error("BUNNY_TOKEN_AUTH_KEY is not configured");
    return key;
  }

  /** The iframe-embed page, kept only as a fallback reference URL (e.g. for
   * manually checking a video in Bunny's own player while debugging) -
   * playback itself no longer uses this, see getSignedPlaybackUrl(). */
  getEmbedUrl(videoId: string): string {
    return `https://iframe.mediadelivery.net/embed/${this.libraryId}/${videoId}`;
  }

  private getStreamUrl(videoId: string): string {
    return `https://vz-${this.libraryId}.b-cdn.net/${videoId}/playlist.m3u8`;
  }

  async getSignedPlaybackUrl(videoId: string): Promise<SignedPlaybackUrl | null> {
    const expires = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS;
    const token = crypto
      .createHash("sha256")
      .update(`${this.tokenAuthKey}${videoId}${expires}`)
      .digest("hex");

    const url = `${this.getStreamUrl(videoId)}?token=${token}&expires=${expires}`;
    return { url, expiresAt: new Date(expires * 1000).toISOString() };
  }
}
