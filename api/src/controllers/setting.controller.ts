import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listSettings,
  updateSettings,
} from "../services/setting.service.js";
import { UpdateSettingsBody } from "../schemas/setting.schema.js";

import { createAuditLog } from "../services/audit.service.js";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const data = await listSettings();
  res.json({ success: true, message: "Settings fetched", data });
});

export const update = asyncHandler(
  async (req: Request<object, object, UpdateSettingsBody>, res: Response) => {
    const data = await updateSettings(req.body, req.user?.userId);
    const io = req.app.get("io");
    if (io) {
      io.emit("settings:updated", data);
      if (req.body.adminGroups) {
        io.emit("group:updated", req.body.adminGroups);
      }
    }

    const currentUser = (req as any).user;
    const detailsStr = req.body.exchangeRate
      ? `Updated USD to KHR Exchange Rate to 1 USD = ${req.body.exchangeRate} KHR`
      : "Updated store configuration & app settings";

    await createAuditLog({
      userId: currentUser?.id,
      userName: currentUser?.name || "Admin",
      userRole: currentUser?.role || "ADMIN",
      action: "SETTING_UPDATE",
      ipAddress: req.ip || "Localhost",
      status: "SUCCESS",
      details: detailsStr,
    });

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
