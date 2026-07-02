import { z } from "zod";

export const RoleEnum = z.enum(["Admin", "Cashier", "Staff", "Member"]);

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
    .min(4, { error: "Password must be at least 4 characters" })
    .max(64, { error: "Password must be max 64 characters" }),

  name: z
    .string()
    .trim()
    .min(1, { error: "Name is required" })
    .max(100, { error: "Name must be max 100 characters" }),

  role: RoleEnum.default("Staff").optional(),
});

export const loginSchema = z.object({
  email: z
    .string({ error: "Email or username is required" })
    .trim()
    .toLowerCase()
    .min(1, { error: "Email or username is required" })
    .max(254, { error: "Email or username must be max 254 characters" }),

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
      .min(4, { error: "New password must be at least 4 characters" })
      .max(64, { error: "New password must be max 64 characters" }),

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
