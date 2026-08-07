import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type BackupExportResult = { filename: string; url: string; expiresIn: number };

/** No restore/list-past-backups endpoint exists (deliberate per Phase 7 -
 * restoring production data from an admin UI is a destructive, high-risk
 * action out of scope here). Export/download only. */
export function useExportBackup() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ApiSuccess<BackupExportResult>>("/api/admin/backup/export");
      return data.data;
    },
  });
}
