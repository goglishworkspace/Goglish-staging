import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type FinancialReport = {
  revenue_cents: number;
  tax_collected_cents: number;
  discounts_given_cents: number;
  refunds_cents: number;
  net_revenue_cents: number;
  invoices_count: number;
  orders_created: number;
  orders_completed: number;
  conversion_rate: number;
  active_subscriptions_by_plan: Record<string, number>;
};

export function useFinancialReport(from?: string, to?: string) {
  return useQuery({
    queryKey: ["admin-financial-report", from ?? null, to ?? null],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<FinancialReport>>("/api/admin/reports/financial", {
        params: { from, to },
      });
      return data.data;
    },
    staleTime: 60 * 1000,
  });
}
