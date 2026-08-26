import { z } from "zod";

export const createReviewSchema = z.object({
  target_type: z.enum(["course", "teacher"]),
  target_id: z.uuid("target_id غير صالح"),
  rating: z.number().int().min(1, "التقييم لازم يكون بين 1 و5").max(5, "التقييم لازم يكون بين 1 و5"),
  comment: z.string().trim().max(2000, "التعليق طويل جداً").optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const reportReviewSchema = z.object({
  reason: z.string().trim().min(1).optional(),
});
export type ReportReviewInput = z.infer<typeof reportReviewSchema>;
