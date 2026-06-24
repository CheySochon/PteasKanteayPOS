import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  listStockMovements,
  createStockAdjustment,
  getLowStock,
} from "../services/inventory.service.js";
import {
  CreateIngredientBody,
  UpdateIngredientBody,
  StockAdjustmentBody,
} from "../schemas/inventory.schema.js";

export const listIngredientsHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    const data = await listIngredients();
    res.json({ success: true, message: "Ingredients fetched", data });
  },
);

export const createIngredientHandler = asyncHandler(
  async (req: Request<object, object, CreateIngredientBody>, res: Response) => {
    const data = await createIngredient(req.body);
    res.status(201).json({ success: true, message: "Ingredient created", data });
  },
);

export const updateIngredientHandler = asyncHandler(
  async (
    req: Request<{ id: string }, object, UpdateIngredientBody>,
    res: Response,
  ) => {
    const data = await updateIngredient(Number(req.params.id), req.body);
    res.json({ success: true, message: "Ingredient updated", data });
  },
);

export const deleteIngredientHandler = asyncHandler(
  async (req: Request<{ id: string }>, res: Response) => {
    await deleteIngredient(Number(req.params.id));
    res.json({ success: true, message: "Ingredient deleted" });
  },
);

export const listStockMovementsHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    const data = await listStockMovements();
    res.json({ success: true, message: "Stock movements fetched", data });
  },
);

export const stockAdjustmentHandler = asyncHandler(
  async (req: Request<object, object, StockAdjustmentBody>, res: Response) => {
    const data = await createStockAdjustment({
      ...req.body,
      createdById: req.user?.userId,
    });
    res.status(201).json({ success: true, message: "Stock adjustment created", data });
  },
);

export const lowStockHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    const data = await getLowStock();
    res.json({ success: true, message: "Low stock fetched", data });
  },
);
