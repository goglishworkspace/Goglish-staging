import { z } from "zod";

/**
 * A response's shape depends on the question's type, which we only know
 * after fetching it from the DB - so this stays intentionally loose here.
 * lib/services/scoring.service.ts does the type-specific interpretation
 * against the actual question.type.
 */
const responseValueSchema = z.union([
  z.string(), // essay, fill_blank
  z.array(z.string()), // ordering (ordered answer ids)
  z.array(z.object({ left: z.string(), right: z.string() })), // matching, drag_drop (answer id pairs)
]);

const responseItemSchema = z.object({
  question_id: z.uuid("question_id غير صالح"),
  response: responseValueSchema,
});

export const submitAttemptSchema = z.object({
  responses: z.array(responseItemSchema).min(1, "لازم تجاوب على سؤال واحد على الأقل"),
});
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;

// Anti-cheat auto-submit (leaving the exam tab) may fire with zero answered
// questions yet - that's still a valid "abandoned" outcome, just scores 0.
export const leaveAttemptSchema = z.object({
  responses: z.array(responseItemSchema).default([]),
});
export type LeaveAttemptInput = z.infer<typeof leaveAttemptSchema>;
