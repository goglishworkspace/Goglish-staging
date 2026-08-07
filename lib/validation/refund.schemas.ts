import { z } from "zod";

export const createRefundSchema = z.object({
  payment_id: z.uuid("payment_id غير صالح"),
  amount_cents: z.number().int().min(1).optional(), // omit = full refund
  reason: z.string().trim().min(1, "سبب الاسترجاع مطلوب"),
});
export type CreateRefundInput = z.infer<typeof createRefundSchema>;
