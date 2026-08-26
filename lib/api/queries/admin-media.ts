import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type MediaFile = {
  id: string;
  storage_bucket: string;
  storage_path: string;
  file_type: "image" | "pdf" | "audio" | "zip" | "other";
  original_filename: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
  url: string | null;
};

export function useMediaFiles() {
  return useQuery({
    queryKey: ["admin-media"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<MediaFile[]>>("/api/admin/media");
      return data.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useUploadMediaFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      // Let the browser set Content-Type (with the multipart boundary) itself -
      // the axios instance's default "application/json" header must be
      // explicitly cleared here, not overridden with a boundary-less value.
      const { data } = await api.post<ApiSuccess<MediaFile>>("/api/admin/media", formData, {
        headers: { "Content-Type": undefined },
      });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-media"] }),
  });
}

export function useRenameMediaFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; original_filename: string }) => {
      const { data } = await api.patch(`/api/admin/media/${input.id}`, { original_filename: input.original_filename });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-media"] }),
  });
}

export function useDeleteMediaFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/api/admin/media/${id}`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-media"] }),
  });
}
