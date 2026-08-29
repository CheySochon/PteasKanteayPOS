import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listPurchaseOrders,
  createPurchaseOrder,
  receivePurchaseOrderStock,
} from "../services/purchaseOrder.service.js";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const pos = await listPurchaseOrders();
  res.json({ success: true, data: pos });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || null;
  const po = await createPurchaseOrder({ ...req.body, createdById: userId });
  const io = req.app.get("io");
  if (io) io.emit("po:created", po);
  res.status(201).json({ success: true, data: po });
});

export const receive = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const idVal = Number(req.params.id);
  if (isNaN(idVal)) {
    res.status(400).json({ success: false, message: "Invalid Purchase Order ID" });
    return;
  }
  const userId = req.user?.userId || null;
  const po = await receivePurchaseOrderStock(idVal, userId);
  const io = req.app.get("io");
  if (io) {
    io.emit("po:updated", po);
    io.emit("inventory:updated");
  }
  res.json({ success: true, message: "Stock received successfully", data: po });
});
