import { z } from "zod";

export const startShiftSchema = z.object({
  openingCash: z.number().nonnegative().default(0).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const endShiftSchema = z.object({
  closingCash: z.number().nonnegative().default(0).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type StartShiftBody = z.infer<typeof startShiftSchema>;
export type EndShiftBody = z.infer<typeof endShiftSchema>;
