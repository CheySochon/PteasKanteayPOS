import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listInventory,
  adjustStock,
  updateInventorySettings,
  listStockTransactions,
  addInventoryItem,
} from "../services/inventory.service.js";
import {
  AdjustStockBody,
  UpdateInventorySettingsBody,
  AddInventoryItemBody,
} from "../schemas/inventory.schema.js";

export const getInventory = asyncHandler(async (_req: Request, res: Response) => {
  const data = await listInventory();
  res.json({ success: true, message: "Inventory fetched", data });
});

export const adjustInventoryStock = asyncHandler(
  async (req: Request<object, object, AdjustStockBody>, res: Response) => {
    const userId = req.user?.userId || null;
    const { productId, type, quantity, notes } = req.body;

    const data = await adjustStock(
      productId,
      quantity,
      type,
      null, // referenceId
      notes || null,
      userId,
    );

    const io = req.app.get("io") as { emit: (event: string, data: unknown) => void } | undefined;
    if (io) {
      io.emit("inventory:updated", data);
    }

    res.json({ success: true, message: "Stock adjusted successfully", data });
  },
);

export const updateInventoryConfig = asyncHandler(
  async (req: Request<object, object, UpdateInventorySettingsBody>, res: Response) => {
    const { productId, trackStock, minStock, unit, name, quantity } = req.body;
    const userId = req.user?.userId || null;

    const data = await updateInventorySettings(productId, {
      trackStock,
      minStock,
      unit,
      name,
      quantity,
    }, userId);

    const io = req.app.get("io") as { emit: (event: string, data: unknown) => void } | undefined;
    if (io) {
      io.emit("inventory:updated", data);
    }

    res.json({ success: true, message: "Inventory settings updated", data });
  },
);

export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const productId = req.query.productId ? Number(req.query.productId) : undefined;
  const data = await listStockTransactions(productId);
  res.json({ success: true, message: "Transactions fetched", data });
});

export const createInventoryItem = asyncHandler(
  async (req: Request<object, object, AddInventoryItemBody>, res: Response) => {
    const userId = req.user?.userId || null;
    const data = await addInventoryItem(req.body, userId);
    const io = req.app.get("io") as { emit: (event: string, data: unknown) => void } | undefined;
    if (io) {
      io.emit("inventory:updated", data);
    }
    res.status(201).json({ success: true, message: "Inventory item created", data });
  }
);
