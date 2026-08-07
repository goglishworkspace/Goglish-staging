import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  phone_verified_at: string | null;
  national_id: string | null;
  birth_date: string;
  grade: "grade1" | "grade2" | "grade3" | null;
  xp_total: number;
  coins_total: number;
  current_streak_days: number;
  longest_streak_days: number;
  comment_banned: boolean;
  comment_suspended_until: string | null;
  comment_ban_reason: string | null;
  created_at: string;
  email: string;
  avatar_url: string | null;
  personal_info_updated_at: string | null;
};

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Profile>>("/api/profile");
      return data.data;
    },
    staleTime: 60 * 1000,
    // The public Navbar also calls this to detect a logged-in session -
    // for an anonymous visitor this 401s every time, and that's a
    // definitive "not logged in" answer, not a transient failure worth
    // React Query's default 3 retries.
    retry: false,
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post<ApiSuccess<{ avatar_url: string }>>("/api/profile/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useDeleteAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete("/api/profile/avatar");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export type UpdatePersonalInfoInput = { first_name?: string; last_name?: string; phone?: string };

export function useUpdatePersonalInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdatePersonalInfoInput) => {
      const { data } = await api.patch<ApiSuccess<Pick<Profile, "first_name" | "last_name" | "phone" | "personal_info_updated_at">>>(
        "/api/profile",
        input,
      );
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
}
