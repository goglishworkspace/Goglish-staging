import { z } from "zod";

export const upsertSeoSchema = z.object({
  path: z.string().trim().min(1, "path مطلوب"),
  title: z.string().trim().optional(),
  description: z.string().trim().optional(),
  og_image_url: z
    .string()
    .url()
    .refine((url) => url.startsWith("https://") || url.startsWith("http://"), {
      message: "يجب أن يكون رابطاً صحيحاً يبدأ بـ http أو https",
    })
    .optional(),
  canonical_url: z
    .string()
    .url()
    .refine((url) => url.startsWith("https://") || url.startsWith("http://"), {
      message: "يجب أن يكون رابطاً صحيحاً يبدأ بـ http أو https",
    })
    .optional(),
  schema_json: z.record(z.string(), z.unknown()).optional(),
});
export type UpsertSeoInput = z.infer<typeof upsertSeoSchema>;
