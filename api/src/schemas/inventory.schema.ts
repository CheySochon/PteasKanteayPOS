import { z } from "zod";

export const createIngredientSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(1, { error: "Name is required" })
    .max(200),
  unit: z.string({ error: "Unit is required" }).trim().min(1).max(50),
  currentStock: z.number().nonnegative().default(0).optional(),
  minStock: z.number().nonnegative().default(0).optional(),
  costPerUnit: z.number().nonnegative().default(0).optional(),
});

export const updateIngredientSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  unit: z.string().trim().min(1).max(50).optional(),
  currentStock: z.number().nonnegative().optional(),
  minStock: z.number().nonnegative().optional(),
  costPerUnit: z.number().nonnegative().optional(),
});

export const stockAdjustmentSchema = z.object({
  ingredientId: z.number({ error: "ingredientId is required" }).int().positive(),
  quantity: z.number({ error: "quantity is required" }).positive(),
  type: z.enum(["in", "out", "adjustment"]).default("adjustment").optional(),
  reason: z.string().trim().max(500).optional(),
});

export type CreateIngredientBody = z.infer<typeof createIngredientSchema>;
export type UpdateIngredientBody = z.infer<typeof updateIngredientSchema>;
export type StockAdjustmentBody = z.infer<typeof stockAdjustmentSchema>;
