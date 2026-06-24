import { z } from "zod";

const variantSchema = z.object({
  name: z.string().trim().min(1).max(100),
  price: z.number().nonnegative(),
  sku: z.string().trim().max(100).optional(),
  isAvailable: z.boolean().default(true).optional(),
});

export const createProductSchema = z.object({
  categoryId: z.number({ error: "categoryId is required" }).int().positive(),
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(1, { error: "Name is required" })
    .max(200),
  slug: z.string().trim().toLowerCase().optional(),
  description: z.string().trim().max(1000).optional(),
  imageUrl: z.string().trim().url().optional(),
  basePrice: z.number().nonnegative(),
  isAvailable: z.boolean().default(true).optional(),
  variants: z.array(variantSchema).optional(),
});

export const updateProductSchema = z.object({
  categoryId: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(200).optional(),
  slug: z.string().trim().toLowerCase().optional(),
  description: z.string().trim().max(1000).optional(),
  imageUrl: z.string().trim().url().optional().nullable(),
  basePrice: z.number().nonnegative().optional(),
  isAvailable: z.boolean().optional(),
});

export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;
