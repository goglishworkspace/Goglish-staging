import { z } from "zod";

export const createCommentSchema = z.object({
  content: z.string().trim().min(1, "التعليق مطلوب").max(2000, "التعليق طويل جداً"),
  parent_comment_id: z.uuid().optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const reviewCommentSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  rejection_reason: z.string().trim().min(1).optional(),
});
export type ReviewCommentInput = z.infer<typeof reviewCommentSchema>;

export const reportCommentSchema = z.object({
  reason: z.string().trim().min(1).optional(),
});
export type ReportCommentInput = z.infer<typeof reportCommentSchema>;

export const commentBanSchema = z.object({
  user_id: z.uuid(),
  banned: z.boolean(),
  reason: z.string().trim().min(1).optional(),
});
export type CommentBanInput = z.infer<typeof commentBanSchema>;
