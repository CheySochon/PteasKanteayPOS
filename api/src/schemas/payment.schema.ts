import { z } from "zod";

export const createPaymentSchema = z.object({
  orderId: z.number({ error: "orderId is required" }).int().positive(),
  method: z.string().default("cash").optional(),
  status: z.string().default("completed").optional(),
  amount: z.number({ error: "amount is required" }).positive(),
  reference: z.string().trim().max(200).optional(),
});

export type CreatePaymentBody = z.infer<typeof createPaymentSchema>;
