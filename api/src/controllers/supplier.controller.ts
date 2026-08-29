import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../services/supplier.service.js";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const suppliers = await listSuppliers();
  res.json({ success: true, data: suppliers });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await createSupplier(req.body);
  const io = req.app.get("io");
  if (io) io.emit("supplier:created", supplier);
  res.status(201).json({ success: true, data: supplier });
});

export const update = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const idVal = Number(req.params.id);
  if (isNaN(idVal)) {
    res.status(400).json({ success: false, message: "Invalid supplier ID" });
    return;
  }
  const supplier = await updateSupplier(idVal, req.body);
  const io = req.app.get("io");
  if (io) io.emit("supplier:updated", supplier);
  res.json({ success: true, data: supplier });
});

export const remove = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const idVal = Number(req.params.id);
  if (isNaN(idVal)) {
    res.status(400).json({ success: false, message: "Invalid supplier ID" });
    return;
  }
  await deleteSupplier(idVal);
  const io = req.app.get("io");
  if (io) io.emit("supplier:deleted", { id: idVal });
  res.json({ success: true, message: "Supplier deleted" });
});
