import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(1, { error: "Name is required" })
    .max(200),
  phone: z.string().trim().max(30).optional(),
  email: z.email().trim().toLowerCase().max(254).optional(),
  loyaltyPoints: z.number().int().nonnegative().default(0).optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.email().trim().toLowerCase().max(254).optional(),
  loyaltyPoints: z.number().int().nonnegative().optional(),
});

export type CreateCustomerBody = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerBody = z.infer<typeof updateCustomerSchema>;
