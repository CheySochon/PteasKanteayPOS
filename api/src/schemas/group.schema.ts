import { z } from "zod";

export const createGroupSchema = z.object({
  name: z
    .string({ error: (i) => (i.input === undefined ? "Group name is required" : "Invalid group name") })
    .trim()
    .min(1, { message: "Group name cannot be empty" })
    .max(100, { message: "Group name max length is 100 characters" }),
  description: z.string().trim().optional(),
  permission_ids: z.array(z.number().int().positive()).optional(),
  permissionIds: z.array(z.number().int().positive()).optional(),
  permission_codes: z.array(z.string()).optional(),
  permissionCodes: z.array(z.string()).optional(),
  parent_id: z.number().int().nonnegative().optional(),
  parentId: z.number().int().nonnegative().optional(),
  status: z.enum(["Normal", "Disabled"]).optional(),
});

export const updateGroupSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().optional(),
  permission_ids: z.array(z.number().int().positive()).optional(),
  permissionIds: z.array(z.number().int().positive()).optional(),
  permission_codes: z.array(z.string()).optional(),
  permissionCodes: z.array(z.string()).optional(),
  parent_id: z.number().int().nonnegative().optional(),
  parentId: z.number().int().nonnegative().optional(),
  status: z.enum(["Normal", "Disabled"]).optional(),
});

export type CreateGroupBody = z.infer<typeof createGroupSchema>;
export type UpdateGroupBody = z.infer<typeof updateGroupSchema>;
