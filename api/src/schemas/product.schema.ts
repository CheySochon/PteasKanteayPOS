import { z } from "zod";

export const createProductSchema = z.object({
  categoryId: z.number({ error: "categoryId is required" }).int().positive(),
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(1, { error: "Name is required" })
    .max(200),
  nameKm: z.string().trim().max(200).optional().nullable(),
  slug: z.string().trim().toLowerCase().optional(),
  description: z.string().trim().max(1000).optional(),
  descriptionKm: z.string().trim().max(1000).optional().nullable(),
  imageUrl: z.string().trim().optional(),
  basePrice: z.number().nonnegative(),
  isAvailable: z.boolean().default(true).optional(),
  prepTime: z.number().int().nonnegative().optional(),
  unit: z.string().trim().max(50).default("pc").optional(),
  trackStock: z.boolean().default(false).optional(),
});

export const updateProductSchema = z.object({
  categoryId: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(200).optional(),
  nameKm: z.string().trim().max(200).optional().nullable(),
  slug: z.string().trim().toLowerCase().optional(),
  description: z.string().trim().max(1000).optional(),
  descriptionKm: z.string().trim().max(1000).optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),
  basePrice: z.number().nonnegative().optional(),
  isAvailable: z.boolean().optional(),
  prepTime: z.number().int().nonnegative().optional(),
  unit: z.string().trim().max(50).optional(),
  trackStock: z.boolean().optional(),
});

export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;

