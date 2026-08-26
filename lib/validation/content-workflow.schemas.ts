import { z } from "zod";

/** Shared by the courses and lessons review endpoints. */
export const reviewContentSchema = z
  .object({
    decision: z.enum(["published", "rejected"]),
    rejection_reason: z.string().trim().optional(),
  })
  .refine((data) => data.decision !== "rejected" || !!data.rejection_reason, {
    message: "سبب الرفض مطلوب",
    path: ["rejection_reason"],
  });
export type ReviewContentInput = z.infer<typeof reviewContentSchema>;
