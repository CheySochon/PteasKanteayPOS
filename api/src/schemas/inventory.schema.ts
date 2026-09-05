import { z } from "zod";

export const adjustStockSchema = z.object({
  productId: z.number({ error: "productId is required" }).int().positive(),
  type: z.enum(["restock", "sale", "damage", "adjustment", "return", "expired"], {
    error: "Type must be one of: restock, sale, damage, adjustment, return, expired",
  }),
  quantity: z.number({ error: "quantity is required" }), // can be decimal
  notes: z.string().trim().max(500).optional(),
});

export const updateInventorySettingsSchema = z.object({
  productId: z.number({ error: "productId is required" }).int().positive(),
  trackStock: z.boolean().optional(),
  minStock: z.number().nonnegative().optional(),
  unit: z.string().trim().min(1).max(50).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  quantity: z.number().optional(),
  supplierId: z.number().int().positive().nullable().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
});

export const addInventoryItemSchema = z.object({
  name: z.string({ error: "name is required" }).trim().min(1).max(200),
  unit: z.string({ error: "unit is required" }).trim().min(1).max(50),
  quantity: z.number({ error: "quantity is required" }),
  minStock: z.number({ error: "minStock is required" }).nonnegative(),
  supplierId: z.number().int().positive().nullable().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
});

export type AdjustStockBody = z.infer<typeof adjustStockSchema>;
export type UpdateInventorySettingsBody = z.infer<typeof updateInventorySettingsSchema>;
export type AddInventoryItemBody = z.infer<typeof addInventoryItemSchema>;
