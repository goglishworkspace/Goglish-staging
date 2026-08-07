import { z } from "zod";

export const createAnnouncementSchema = z
  .object({
    title: z.string().trim().min(1, "العنوان مطلوب"),
    body: z.string().trim().min(1, "المحتوى مطلوب"),
    target: z.enum(["all", "grade"]),
    target_grade: z.enum(["grade1", "grade2", "grade3"]).optional(),
    expires_at: z.iso.datetime().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.target === "grade" && !data.target_grade) {
      ctx.addIssue({
        code: "custom",
        message: "target_grade مطلوب لما target تكون grade",
        path: ["target_grade"],
      });
    }
  });
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
