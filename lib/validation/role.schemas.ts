import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().trim().min(1, "اسم الدور مطلوب"),
  description: z.string().trim().optional(),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  description: z.string().trim().optional(),
});
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const createPermissionSchema = z.object({
  name: z.string().trim().min(1, "اسم الصلاحية مطلوب"),
  description: z.string().trim().optional(),
});
export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;

export const assignPermissionSchema = z.object({
  permission_name: z.string().trim().min(1, "اسم الصلاحية مطلوب"),
});
export type AssignPermissionInput = z.infer<typeof assignPermissionSchema>;
