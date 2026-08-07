import { z } from "zod";

const base = {
  prompt: z.string().trim().min(1, "نص السؤال مطلوب"),
  points: z.number().positive().optional(),
  order_index: z.number().int().min(0),
};

const mcqSchema = z.object({
  ...base,
  type: z.literal("mcq"),
  options: z
    .array(z.object({ content: z.string().trim().min(1), is_correct: z.boolean() }))
    .min(2, "لازم خيارين على الأقل"),
});

const trueFalseSchema = z.object({
  ...base,
  type: z.literal("true_false"),
  correct_answer: z.boolean(),
});

const matchingSchema = z.object({
  ...base,
  type: z.literal("matching"),
  pairs: z
    .array(z.object({ left: z.string().trim().min(1), right: z.string().trim().min(1) }))
    .min(2, "لازم زوجين على الأقل"),
});

const dragDropSchema = z.object({
  ...base,
  type: z.literal("drag_drop"),
  pairs: z
    .array(z.object({ left: z.string().trim().min(1), right: z.string().trim().min(1) }))
    .min(2, "لازم زوجين على الأقل"),
});

const orderingSchema = z.object({
  ...base,
  type: z.literal("ordering"),
  // بترتيبها الصحيح
  items: z.array(z.string().trim().min(1)).min(2, "لازم عنصرين على الأقل"),
});

const fillBlankSchema = z.object({
  ...base,
  type: z.literal("fill_blank"),
  accepted_answers: z.array(z.string().trim().min(1)).min(1, "لازم إجابة مقبولة واحدة على الأقل"),
});

const essaySchema = z.object({
  ...base,
  type: z.literal("essay"),
  model_answer: z.string().trim().optional(),
});

export const createQuestionSchema = z
  .discriminatedUnion("type", [
    mcqSchema,
    trueFalseSchema,
    matchingSchema,
    dragDropSchema,
    orderingSchema,
    fillBlankSchema,
    essaySchema,
  ])
  .superRefine((data, ctx) => {
    if (data.type === "mcq") {
      const correctCount = data.options.filter((o) => o.is_correct).length;
      if (correctCount !== 1) {
        ctx.addIssue({
          code: "custom",
          message: "لازم إجابة صحيحة واحدة بالظبط",
          path: ["options"],
        });
      }
    }
  });
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
