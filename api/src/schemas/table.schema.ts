import { z } from "zod";

export const createTableSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(1, { error: "Name is required" })
    .max(100),
  capacity: z.number().int().positive().default(2).optional(),
  zone: z.string().trim().max(100).default("indoor").optional(),
  qrToken: z.string().trim().optional(),
  isActive: z.boolean().default(true).optional(),
});

export const updateTableSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  capacity: z.number().int().positive().optional(),
  zone: z.string().trim().max(100).optional(),
  qrToken: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

export type CreateTableBody = z.infer<typeof createTableSchema>;
export type UpdateTableBody = z.infer<typeof updateTableSchema>;

export const moveTableSchema = z.object({
  sourceTableId: z.number({ error: "sourceTableId is required" }).int().positive(),
  targetTableId: z.number({ error: "targetTableId is required" }).int().positive(),
});

export const mergeTableSchema = z.object({
  sourceTableId: z.number({ error: "sourceTableId is required" }).int().positive(),
  targetTableId: z.number({ error: "targetTableId is required" }).int().positive(),
});

export type MoveTableBody = z.infer<typeof moveTableSchema>;
export type MergeTableBody = z.infer<typeof mergeTableSchema>;

