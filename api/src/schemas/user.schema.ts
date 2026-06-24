import { z } from "zod";
import { Role } from "../prisma/client.js";

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
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
  role: z.enum(Role).default(Role.WAITER).optional(),
  isActive: z.boolean().default(true).optional(),
});

export const updateUserSchema = z.object({
  email: z.email().trim().toLowerCase().max(254).optional(),
  password: z.string().min(8).max(64).optional(),
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
  role: z.enum(Role).optional(),
  isActive: z.boolean().optional(),
});

export type CreateUserBody = z.infer<typeof createUserSchema>;
export type UpdateUserBody = z.infer<typeof updateUserSchema>;
