import "server-only";

export type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "retrying" | "cancelled";

// PENDING -> PROCESSING -> COMPLETED
//                        -> FAILED -> RETRYING -> COMPLETED
//                                              -> CANCELLED
const ALLOWED_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["completed", "failed"],
  failed: ["retrying", "cancelled"],
  retrying: ["processing", "cancelled"],
  completed: [],
  cancelled: [],
};

export const MAX_PAYMENT_ATTEMPTS = 3;

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
