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

export const updatePasswordSchema = z
  .object({
    currentPassword: z
      .string({ error: "Current password is required" })
      .min(1, { error: "Current password is required" })
      .max(64, { error: "Current password must be max 64 characters" }),

    newPassword: z
      .string({ error: "New password is required" })
      .min(12, { error: "New password must be at least 12 characters" })
      .max(64, { error: "New password must be max 64 characters" })
      .regex(/[a-z]/, {
        error: "New password must contain at least one lowercase letter",
      })
      .regex(/[A-Z]/, {
        error: "New password must contain at least one uppercase letter",
      })
      .regex(/[0-9]/, {
        error: "New password must contain at least one number",
      })
      .regex(/[^A-Za-z0-9]/, {
        error: "New password must contain at least one special character",
      }),

    confirmPassword: z
      .string({ error: "Confirm password is required" })
      .min(1, { error: "Confirm password is required" })
      .max(64, { error: "Confirm password must be max 64 characters" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type UpdatePasswordBody = z.infer<typeof updatePasswordSchema>;
