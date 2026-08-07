import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type AuditLog = {
  id: string;
  actor_user_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type AuditLogsPage = { logs: AuditLog[]; page: number; pageSize: number; total: number };

export function useAuditLogs(page: number, filters?: { actor_user_id?: string; action?: string }) {
  return useQuery({
    queryKey: ["admin-audit-logs", page, filters?.actor_user_id ?? "", filters?.action ?? ""],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<AuditLogsPage>>("/api/admin/audit-logs", {
        params: { ...filters, page },
      });
      return data.data;
    },
    staleTime: 30 * 1000,
  });
}
