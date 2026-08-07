import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type WishlistCourse = {
  course_id: string;
  created_at: string;
  courses: { id: string; title: string; slug: string; cover_image_url: string | null } | null;
};

export type WishlistTeacher = {
  teacher_id: string;
  created_at: string;
  teachers: { id: string; teacher_profiles: { display_name: string; photo_url: string | null } | null } | null;
};

export function useWishlistCourses(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["wishlist-courses"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<WishlistCourse[]>>("/api/wishlist/courses");
      return data.data;
    },
    enabled: options.enabled,
    retry: false,
  });
}

export function useWishlistTeachers(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["wishlist-teachers"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<WishlistTeacher[]>>("/api/wishlist/teachers");
      return data.data;
    },
    enabled: options.enabled,
    retry: false,
  });
}

export function useAddWishlistCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) => {
      await api.post("/api/wishlist/courses", { course_id: courseId });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist-courses"] }),
  });
}

export function useAddWishlistTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (teacherId: string) => {
      await api.post("/api/wishlist/teachers", { teacher_id: teacherId });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist-teachers"] }),
  });
}

export function useRemoveWishlistCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) => {
      await api.delete("/api/wishlist/courses", { params: { course_id: courseId } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist-courses"] }),
  });
}

export function useRemoveWishlistTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (teacherId: string) => {
      await api.delete("/api/wishlist/teachers", { params: { teacher_id: teacherId } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist-teachers"] }),
  });
}
