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

export const uploadImage = asyncHandler(
  (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ success: false, message: "Restaurant image is required" });
      return;
    }

    const imageUrl = `/uploads/settings/${req.file.filename}`;

    res.status(201).json({
      success: true,
      message: "Restaurant image uploaded",
      data: { imageUrl },
    });
  },
);
