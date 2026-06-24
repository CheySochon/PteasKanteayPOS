import { z } from "zod";

const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive().optional(),
  quantity: z.number().int().positive().default(1),
  notes: z.string().trim().max(500).optional(),
  modifierIds: z.array(z.number().int().positive()).optional(),
});

export const createOrderSchema = z.object({
  tableId: z.number().int().positive().optional(),
  tableNo: z.string().trim().optional(),
  customerId: z.number().int().positive().optional(),
  status: z.string().default("pending").optional(),
  notes: z.string().trim().max(1000).optional(),
  discountAmount: z.number().nonnegative().default(0).optional(),
  taxAmount: z.number().nonnegative().default(0).optional(),
  items: z.array(orderItemSchema).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.string({ error: "Status is required" }).min(1),
});

export const addOrderItemSchema = orderItemSchema;

export const splitBillSchema = z.object({
  splits: z.array(
    z.object({
      label: z.string().trim().optional(),
      amount: z.number().positive(),
    }),
  ),
});

export type CreateOrderBody = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusBody = z.infer<typeof updateOrderStatusSchema>;
export type AddOrderItemBody = z.infer<typeof addOrderItemSchema>;
export type SplitBillBody = z.infer<typeof splitBillSchema>;
