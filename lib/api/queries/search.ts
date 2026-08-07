import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type CourseSearchResult = {
  id: string;
  title: string;
  slug: string;
  cover_image_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  price_cents: number;
  currency: string;
};

export type TeacherSearchResult = {
  teacher_id: string;
  display_name: string;
  bio: string | null;
  photo_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
};

export function useSearchCourses(query: string) {
  return useQuery({
    queryKey: ["search-courses", query],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<CourseSearchResult[]>>("/api/search/courses", {
        params: { q: query },
      });
      return data.data;
    },
    enabled: query.trim().length > 0,
  });
}

export function useSearchTeachers(query: string) {
  return useQuery({
    queryKey: ["search-teachers", query],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<TeacherSearchResult[]>>("/api/search/teachers", {
        params: { q: query },
      });
      return data.data;
    },
    enabled: query.trim().length > 0,
  });
}
