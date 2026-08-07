import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export function useFeaturedVideo() {
  return useQuery({
    queryKey: ["homepage-featured-video"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<{ video_url: string | null }>>("/api/homepage/featured-video");
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
