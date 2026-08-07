import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";
import type { Course } from "./courses";

/** RLS scopes this to "published, or mine to manage" for a normal caller,
 * but staff roles (admin/moderator/content_manager) see every course
 * regardless of status - same GET /api/courses endpoint, no separate
 * admin-only route needed. */
export function useAllCourses(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Course[]>>("/api/courses");
      return data.data;
    },
    staleTime: 30 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useReviewCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { courseId: string; decision: "published" | "rejected"; rejection_reason?: string }) => {
      const { data } = await api.post(`/api/courses/${input.courseId}/review`, {
        decision: input.decision,
        rejection_reason: input.rejection_reason,
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-courses"] }),
  });
}

export type PendingLesson = {
  id: string;
  title: string;
  status: string;
  submitted_at: string;
  module_id: string;
  modules: { title: string; course_id: string; courses: { title: string } | { title: string }[] | null } | { title: string; course_id: string; courses: { title: string } | { title: string }[] | null }[] | null;
};

function normalizeOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function getPendingLessonContext(lesson: PendingLesson): { moduleTitle: string; courseTitle: string; courseId: string } {
  const mod = normalizeOne(lesson.modules);
  const course = mod ? normalizeOne(mod.courses) : null;
  return { moduleTitle: mod?.title ?? "", courseTitle: course?.title ?? "", courseId: mod?.course_id ?? "" };
}

export function usePendingLessons(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["admin-pending-lessons"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<PendingLesson[]>>("/api/admin/content/pending-lessons");
      return data.data;
    },
    staleTime: 15 * 1000,
    enabled: options?.enabled ?? true,
  });
}

/** Active (non-revoked) course_entitlements rows, counted per course_id -
 * course_entitlements_select_own_or_admin RLS lets admin/super_admin/support
 * read every row (not just their own), so this needs no service-role client.
 * Subscribers aren't counted here - they get every published course via an
 * active subscription, not a per-course row, and mixing the two into one
 * number would misrepresent "how many people bought this specific course". */
export function useCourseEnrollmentCounts() {
  return useQuery({
    queryKey: ["admin-course-enrollment-counts"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<{ course_id: string }[]>>("/api/admin/course-entitlements");
      const counts: Record<string, number> = {};
      for (const row of data.data) counts[row.course_id] = (counts[row.course_id] ?? 0) + 1;
      return counts;
    },
    staleTime: 30 * 1000,
  });
}

export function useReviewLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { lessonId: string; decision: "published" | "rejected"; rejection_reason?: string }) => {
      const { data } = await api.post(`/api/lessons/${input.lessonId}/review`, {
        decision: input.decision,
        rejection_reason: input.rejection_reason,
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-pending-lessons"] }),
  });
}
