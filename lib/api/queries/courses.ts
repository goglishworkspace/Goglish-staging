import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type CourseTeacher = { id: string; display_name: string | null };

// Supabase returns a many-to-one embed (courses.subject_id -> subjects.id,
// and subjects.grade_id -> grades.id) as a single object normally, but the
// generated type allows either shape - defensive unwrapping at the read
// site (see CourseCard) matches this codebase's established convention for
// nested embeds.
export type CourseSubject = {
  name: string;
  grades: { name: string } | { name: string }[] | null;
} | null;

export type Course = {
  id: string;
  subject_id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  status: string;
  submitted_at?: string | null;
  rejection_reason?: string | null;
  price_cents: number;
  currency: string;
  created_at: string;
  trailer_youtube_id: string | null;
  teachers: CourseTeacher[];
  has_access: boolean;
  subjects?: CourseSubject | CourseSubject[];
};

export type CourseDetail = Course;

export function courseGradeName(course: Course): string | null {
  const subject = Array.isArray(course.subjects) ? course.subjects[0] : course.subjects;
  const grades = subject?.grades;
  const grade = Array.isArray(grades) ? grades[0] : grades;
  return grade?.name ?? null;
}

export function useCourses(params?: { limit?: number; gradeId?: string; subjectId?: string }) {
  const { limit, gradeId, subjectId } = params ?? {};
  return useQuery({
    queryKey: ["courses", "list", { limit, gradeId, subjectId }],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Course[]>>("/api/courses", {
        params: {
          ...(limit ? { limit } : {}),
          ...(gradeId ? { grade_id: gradeId } : {}),
          ...(subjectId ? { subject_id: subjectId } : {}),
        },
      });
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCoursesBySubject(subjectId: string) {
  return useQuery({
    queryKey: ["courses", "subject", subjectId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Course[]>>("/api/courses", {
        params: { subject_id: subjectId },
      });
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!subjectId,
  });
}

export function useCoursesByTeacher(teacherId: string) {
  return useQuery({
    queryKey: ["courses", "teacher", teacherId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Course[]>>("/api/courses", {
        params: { teacher_id: teacherId },
      });
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!teacherId,
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<CourseDetail>>(`/api/courses/${id}`);
      return data.data;
    },
    staleTime: 60 * 1000,
    enabled: !!id,
  });
}

export type CreateCourseInput = {
  subject_id: string;
  title: string;
  slug: string;
  description?: string;
  price_cents?: number;
  currency?: string;
};

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCourseInput) => {
      const { data } = await api.post<ApiSuccess<Course>>("/api/courses", input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["courses", "teacher"] }),
  });
}

export function useSubmitCourseForReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) => {
      const { data } = await api.post(`/api/courses/${courseId}/submit`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["courses", "teacher"] }),
  });
}

export type UpdateCourseInput = {
  title?: string;
  description?: string;
  trailer_youtube_id?: string;
  price_cents?: number;
};

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, input }: { courseId: string; input: UpdateCourseInput }) => {
      const { data } = await api.patch<ApiSuccess<Course>>(`/api/courses/${courseId}`, input);
      return data.data;
    },
    onSuccess: (_data, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ["courses", "teacher"] });
      queryClient.invalidateQueries({ queryKey: ["course", courseId] });
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) => {
      const { data } = await api.delete(`/api/courses/${courseId}`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-courses"] }),
  });
}
