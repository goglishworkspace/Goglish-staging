import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";
import type { Course } from "./courses";

export type Bundle = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  price_cents: number;
  currency: string;
  is_active: boolean;
  has_access: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Each embedded course carries the same full shape (incl. teachers) as
  // GET /api/courses, so it can render through the exact same CourseCard
  // used on the teacher-profile/courses pages instead of a bundle-specific one.
  bundle_courses: { course_id: string; courses: Course }[];
};

export type BundleDetail = Bundle;

export function bundleCourseList(bundle: Bundle): Course[] {
  return bundle.bundle_courses.map((bc) => bc.courses).filter((c): c is Course => !!c);
}

export function useBundles() {
  return useQuery({
    queryKey: ["bundles"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Bundle[]>>("/api/course-bundles");
      return data.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useBundlesBySubject(subjectId: string) {
  return useQuery({
    queryKey: ["bundles", "subject", subjectId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Bundle[]>>("/api/course-bundles", {
        params: { subject_id: subjectId },
      });
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!subjectId,
  });
}

export function useBundle(id: string) {
  return useQuery({
    queryKey: ["bundle", id],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<BundleDetail>>(`/api/course-bundles/${id}`);
      return data.data;
    },
    staleTime: 30 * 1000,
    enabled: !!id,
  });
}

export type CreateBundleInput = {
  title: string;
  description?: string;
  cover_image_url?: string;
  price_cents: number;
  currency?: string;
  course_ids: string[];
};

export function useCreateBundle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBundleInput) => {
      const { data } = await api.post<ApiSuccess<Bundle>>("/api/course-bundles", input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bundles"] }),
  });
}

export type UpdateBundleInput = {
  title?: string;
  description?: string;
  cover_image_url?: string;
  price_cents?: number;
  is_active?: boolean;
  course_ids?: string[];
};

export function useUpdateBundle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bundleId, input }: { bundleId: string; input: UpdateBundleInput }) => {
      const { data } = await api.patch<ApiSuccess<Bundle>>(`/api/course-bundles/${bundleId}`, input);
      return data.data;
    },
    onSuccess: (_data, { bundleId }) => {
      queryClient.invalidateQueries({ queryKey: ["bundles"] });
      queryClient.invalidateQueries({ queryKey: ["bundle", bundleId] });
    },
  });
}

export function useDeleteBundle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bundleId: string) => {
      const { data } = await api.delete(`/api/course-bundles/${bundleId}`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bundles"] }),
  });
}
