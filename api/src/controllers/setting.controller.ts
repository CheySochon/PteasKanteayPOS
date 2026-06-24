import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listSettings,
  updateSettings,
} from "../services/setting.service.js";
import { UpdateSettingsBody } from "../schemas/setting.schema.js";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const data = await listSettings();
  res.json({ success: true, message: "Settings fetched", data });
});

export const update = asyncHandler(
  async (req: Request<object, object, UpdateSettingsBody>, res: Response) => {
    const data = await updateSettings(req.body, req.user?.userId);
    res.json({ success: true, message: "Settings updated", data });
  },
);
