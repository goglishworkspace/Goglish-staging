import { z } from "zod";

export const createParentLinkSchema = z.object({
  parent_user_id: z.uuid(),
  student_user_id: z.uuid(),
});
export type CreateParentLinkInput = z.infer<typeof createParentLinkSchema>;

export const linkChildByNationalIdSchema = z.object({
  national_id: z.string().trim().regex(/^\d{14}$/, "الرقم القومي لازم يكون 14 رقم"),
});
export type LinkChildByNationalIdInput = z.infer<typeof linkChildByNationalIdSchema>;
