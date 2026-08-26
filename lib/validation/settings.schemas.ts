import { z } from "zod";

export const updateSettingsSchema = z.object({
  entries: z
    .array(z.object({ key: z.string().trim().min(1), value: z.unknown() }))
    .min(1, "لازم إعداد واحد على الأقل"),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
