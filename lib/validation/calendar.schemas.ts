import { z } from "zod";

export const createCalendarEventSchema = z
  .object({
    title: z.string().trim().min(1, "العنوان مطلوب"),
    event_type: z.enum(["lesson_release", "quiz", "exam", "announcement"]),
    scheduled_at: z.iso.datetime(),
    target_table: z.enum(["lessons", "quizzes", "exams"]).optional(),
    target_id: z.uuid().optional(),
    auto_publish: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.target_table && !data.target_id) {
      ctx.addIssue({ code: "custom", message: "target_id مطلوب لما target_table موجود", path: ["target_id"] });
    }
    if (data.auto_publish && !data.target_table) {
      ctx.addIssue({
        code: "custom",
        message: "auto_publish محتاج target_table وtarget_id",
        path: ["auto_publish"],
      });
    }
  });
export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;

export const updateCalendarEventSchema = z.object({
  title: z.string().trim().min(1).optional(),
  scheduled_at: z.iso.datetime().optional(),
  auto_publish: z.boolean().optional(),
});
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;
