import { z } from "zod";

export const updateProgressSchema = z.object({
  progress_seconds: z.number().int().min(0),
  status: z.enum(["in_progress", "completed"]).optional(),
});
export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
