import type { z } from "zod";

/** Converts a Zod safeParse failure into the `errors` shape used by apiError(). */
export function zodErrorsToApiErrors(error: z.ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] != null ? String(issue.path[0]) : "_";
    (errors[field] ??= []).push(issue.message);
  }
  return errors;
}
