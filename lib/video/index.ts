import "server-only";
import type { VideoProvider, VideoProviderName } from "./types";
import { BunnyVideoProvider } from "./bunny.provider";
import { YouTubeVideoProvider } from "./youtube.provider";

export * from "./types";

const providers: Record<VideoProviderName, VideoProvider> = {
  bunny: new BunnyVideoProvider(),
  youtube: new YouTubeVideoProvider(),
};

export function getVideoProvider(name: VideoProviderName): VideoProvider {
  return providers[name];
}
