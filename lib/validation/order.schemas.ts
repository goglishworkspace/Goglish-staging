import { z } from "zod";

export const createOrderSchema = z.object({
  item_type: z.enum(["course", "bundle", "subscription_plan"]),
  item_id: z.uuid("item_id غير صالح"),
  coupon_code: z.string().trim().optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const payOrderSchema = z.object({
  provider: z.enum(["stripe", "paymob", "vodafone_cash", "instapay", "kasher", "daffaa"]),
});
export type PayOrderInput = z.infer<typeof payOrderSchema>;
