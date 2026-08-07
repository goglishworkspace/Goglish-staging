import { z } from "zod";

export const renameMediaFileSchema = z.object({
  original_filename: z.string().trim().min(1, "الاسم مطلوب"),
});
export type RenameMediaFileInput = z.infer<typeof renameMediaFileSchema>;
