import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";
import type { ApiSuccess } from "@/lib/api/response";

export type Coupon = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed" | "free_course" | "free_bundle";
  discount_value: number;
  applies_to_item_id: string | null;
  max_uses: number | null;
  uses_count: number;
  min_purchase_cents: number | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

export function useCoupons() {
  return useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Coupon[]>>("/api/coupons");
      return data.data;
    },
    staleTime: 30 * 1000,
  });
}

export type CreateCouponInput = {
  code: string;
  discount_type: Coupon["discount_type"];
  discount_value?: number;
  applies_to_item_id?: string;
  max_uses?: number;
  min_purchase_cents?: number;
  expires_at?: string;
};

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCouponInput) => {
      const { data } = await api.post<ApiSuccess<Coupon>>("/api/coupons", input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });
}

export function useToggleCouponActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; is_active: boolean }) => {
      const { data } = await api.patch(`/api/coupons/${input.id}`, { is_active: input.is_active });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/api/coupons/${id}`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });
}
