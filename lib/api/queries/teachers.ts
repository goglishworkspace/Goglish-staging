import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

type TeacherProfile = {
  display_name: string;
  bio: string | null;
  photo_url: string | null;
  experience_years: number | null;
  rating_avg: number | null;
  rating_count: number | null;
};

export type Teacher = {
  id: string;
  status: string;
  created_at: string;
  teacher_profiles: TeacherProfile | TeacherProfile[] | null;
};

/** teacher_profiles comes back as an object OR a single-item array depending
 * on how PostgREST infers the embed cardinality - normalize both shapes here
 * so components never have to guard against it. */
export function getTeacherProfile(teacher: Teacher): TeacherProfile | null {
  const profile = teacher.teacher_profiles;
  if (!profile) return null;
  return Array.isArray(profile) ? (profile[0] ?? null) : profile;
}

export function useTeachers() {
  return useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Teacher[]>>("/api/teachers");
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTeacher(id: string) {
  return useQuery({
    queryKey: ["teacher", id],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Teacher>>(`/api/teachers/${id}`);
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}
