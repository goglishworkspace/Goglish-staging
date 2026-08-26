import { z } from "zod";

export const createParentLinkSchema = z.object({
  parent_user_id: z.uuid(),
  student_user_id: z.uuid(),
});
export type CreateParentLinkInput = z.infer<typeof createParentLinkSchema>;

export const linkChildSchema = z.object({
  phone: z.string().trim().optional(),
  national_id: z.string().trim().optional(),
}).refine((data) => !!(data.phone || data.national_id), {
  message: "رقم هاتف الطالب أو الرقم القومي مطلوب",
});
export type LinkChildInput = z.infer<typeof linkChildSchema>;

export const linkChildByNationalIdSchema = linkChildSchema;
export type LinkChildByNationalIdInput = LinkChildInput;
