import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type CourseSearchResult = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  cover_image_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  price_cents: number;
  currency: string;
  grade_id?: string | null;
  grade_name?: string | null;
  grade_slug?: string | null;
  subject_name?: string | null;
  teachers?: { id: string; display_name: string | null }[];
};

export type TeacherSearchResult = {
  teacher_id: string;
  display_name: string;
  bio: string | null;
  photo_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
};

export function useSearchCourses(query: string, gradeSlug?: string) {
  const hasQuery = query.trim().length > 0;
  const hasGrade = !!gradeSlug && gradeSlug !== "all";

  return useQuery({
    queryKey: ["search-courses", query, gradeSlug ?? "all"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<CourseSearchResult[]>>("/api/search/courses", {
        params: {
          ...(hasQuery ? { q: query } : {}),
          ...(hasGrade ? { grade: gradeSlug } : {}),
        },
      });
      return data.data;
    },
    enabled: hasQuery || hasGrade,
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
