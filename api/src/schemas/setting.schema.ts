import { z } from "zod";

export const updateSettingsSchema = z.record(z.string(), z.unknown()).refine(
  (data) => Object.keys(data).length > 0,
  { message: "No settings provided" },
);

export type UpdateSettingsBody = z.infer<typeof updateSettingsSchema>;
