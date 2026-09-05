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
    const io = req.app.get("io") as { emit: (event: string, data: unknown) => void } | undefined;
    if (io) {
      io.emit("category:updated", data);
      io.emit("menu:updated", data);
    }
    res.status(201).json({ success: true, message: "Category created", data });
  },
);

export const update = asyncHandler(
  async (
    req: Request<{ id: string }, object, UpdateCategoryBody>,
    res: Response,
  ) => {
    const data = await updateCategory(Number(req.params.id), req.body);
    const io = req.app.get("io") as { emit: (event: string, data: unknown) => void } | undefined;
    if (io) {
      io.emit("category:updated", data);
      io.emit("menu:updated", data);
    }
    res.json({ success: true, message: "Category updated", data });
  },
);

export const remove = asyncHandler(
  async (req: Request<{ id: string }>, res: Response) => {
    await deleteCategory(Number(req.params.id));
    const io = req.app.get("io") as { emit: (event: string, data: unknown) => void } | undefined;
    if (io) {
      io.emit("category:updated", { id: Number(req.params.id), deleted: true });
      io.emit("menu:updated", { id: Number(req.params.id), deleted: true });
    }
    res.json({ success: true, message: "Category deleted" });
  },
);
