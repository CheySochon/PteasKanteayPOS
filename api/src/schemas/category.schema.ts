import { z } from "zod";

export const createCategorySchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(1, { error: "Name is required" })
    .max(100),
  nameKm: z.string().trim().max(100).optional().nullable(),
  slug: z.string().trim().toLowerCase().optional(),
  description: z.string().trim().max(500).optional(),
  descriptionKm: z.string().trim().max(500).optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  nameKm: z.string().trim().max(100).optional().nullable(),
  slug: z.string().trim().toLowerCase().optional(),
  description: z.string().trim().max(500).optional(),
  descriptionKm: z.string().trim().max(500).optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),
});

export type CreateCategoryBody = z.infer<typeof createCategorySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategorySchema>;
