import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../services/category.service.js";
import {
  CreateCategoryBody,
  UpdateCategoryBody,
} from "../schemas/category.schema.js";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const data = await listCategories();
  res.json({ success: true, message: "Categories fetched", data });
});

export const create = asyncHandler(
  async (req: Request<object, object, CreateCategoryBody>, res: Response) => {
    const data = await createCategory(req.body);
    res.status(201).json({ success: true, message: "Category created", data });
  },
);

export const update = asyncHandler(
  async (
    req: Request<{ id: string }, object, UpdateCategoryBody>,
    res: Response,
  ) => {
    const data = await updateCategory(Number(req.params.id), req.body);
    res.json({ success: true, message: "Category updated", data });
  },
);

export const remove = asyncHandler(
  async (req: Request<{ id: string }>, res: Response) => {
    await deleteCategory(Number(req.params.id));
    res.json({ success: true, message: "Category deleted" });
  },
);
