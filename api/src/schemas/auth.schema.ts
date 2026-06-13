import { z } from "zod";
import { Role } from "../prisma/client.js";

export const RoleEnum = z.enum(Role);

export const registerSchema = z.object({
  email: z
    .email({
      error: (issue) =>
        issue.input === undefined ? "Email is required" : "Invalid email",
    })
    .trim()
    .toLowerCase()
    .max(254, { error: "Email must be max 254 characters" }),

  password: z
    .string({ error: "Password is required" })
    .min(12, { error: "Password must be at least 12 characters" })
    .max(64, { error: "Password must be max 64 characters" })
    .regex(/[a-z]/, {
      error: "Password must contain at least one lowercase letter",
    })
    .regex(/[A-Z]/, {
      error: "Password must contain at least one uppercase letter",
    })
    .regex(/[0-9]/, { error: "Password must contain at least one number" })
    .regex(/[^A-Za-z0-9]/, {
      error: "Password must contain at least one special character",
    }),

  firstName: z
    .string()
    .trim()
    .min(1, { error: "First name is required" })
    .max(50, { error: "First name must be max 50 characters" })
    .optional(),

  lastName: z
    .string()
    .trim()
    .min(1, { error: "Last name is required" })
    .max(50, { error: "Last name must be max 50 characters" })
    .optional(),

  role: RoleEnum.default(Role.WAITER).optional(),
});

export const loginSchema = z.object({
  email: z
    .email({
      error: (issue) =>
        issue.input === undefined ? "Email is required" : "Invalid email",
    })
    .trim()
    .toLowerCase()
    .max(254, { error: "Email must be max 254 characters" }),

  password: z
    .string({ error: "Password is required" })
    .min(1, { error: "Password is required" })
    .max(64, { error: "Password must be max 64 characters" }),
});

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
