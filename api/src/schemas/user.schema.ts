import { z } from "zod";

const ROLES = ["Admin", "Cashier", "Staff", "Member"] as const;

export const createUserSchema = z.object({
  email: z
    .email({ error: (i) => (i.input === undefined ? "Email is required" : "Invalid email") })
    .trim()
    .toLowerCase()
    .max(254),
  password: z
    .string({ error: "Password is required" })
    .min(8, { error: "Password must be at least 8 characters" })
    .max(64),
  name: z.string().trim().min(1).max(100),
  role: z.string().optional(),
  roleName: z.string().optional(),
  isActive: z.boolean().default(true).optional(),
  pin: z.string().regex(/^\d{4}$/, { message: "PIN must be exactly 4 digits" }).optional(),
  imageUrl: z.string().trim().optional(),
  permissions: z.array(z.any()).optional(),
});

export const updateUserSchema = z.object({
  email: z.email().trim().toLowerCase().max(254).optional(),
  password: z.union([z.string().min(8, { error: "Password must be at least 8 characters" }).max(64), z.literal("")]).optional(),
  name: z.string().trim().min(1).max(100).optional(),
  role: z.string().optional(),
  roleName: z.string().optional(),
  isActive: z.boolean().optional(),
  pin: z.union([z.string().regex(/^\d{4}$/, { message: "PIN must be 4 digits" }), z.literal("")]).optional(),
  imageUrl: z.string().trim().optional(),
  permissions: z.array(z.any()).optional(),
});

export type CreateUserBody = z.infer<typeof createUserSchema>;
export type UpdateUserBody = z.infer<typeof updateUserSchema>;
