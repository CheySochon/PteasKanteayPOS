import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listPermissions,
  getCategorizedPermissions,
  createPermission,
} from "../services/permission.service.js";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const permissions = await listPermissions();
  const categorizedData = await getCategorizedPermissions();
  res.json({
    success: true,
    message: "Permissions fetched",
    data: permissions,
    categorized: categorizedData.categorized,
  });
});

export const getCategorized = asyncHandler(async (_req: Request, res: Response) => {
  const result = await getCategorizedPermissions();
  res.json({
    success: true,
    message: "Categorized permissions fetched",
    data: result.all,
    categorized: result.categorized,
  });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const permission = await createPermission(req.body);
  res.status(201).json({ success: true, message: "Permission created", data: permission });
});
