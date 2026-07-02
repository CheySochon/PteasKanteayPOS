import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../services/product.service.js";
import {
  CreateProductBody,
  UpdateProductBody,
} from "../schemas/product.schema.js";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const data = await listProducts();
  res.json({ success: true, message: "Products fetched", data });
});

export const get = asyncHandler(
  async (req: Request<{ id: string }>, res: Response) => {
    const data = await getProduct(Number(req.params.id));
    res.json({ success: true, message: "Product fetched", data });
  },
);

export const create = asyncHandler(
  async (req: Request<object, object, CreateProductBody>, res: Response) => {
    const data = await createProduct(req.body);
    res.status(201).json({ success: true, message: "Product created", data });
  },
);

export const update = asyncHandler(
  async (
    req: Request<{ id: string }, object, UpdateProductBody>,
    res: Response,
  ) => {
    const data = await updateProduct(Number(req.params.id), req.body);
    res.json({ success: true, message: "Product updated", data });
  },
);

export const remove = asyncHandler(
  async (req: Request<{ id: string }>, res: Response) => {
    await deleteProduct(Number(req.params.id));
    res.json({ success: true, message: "Product deleted" });
  },
);

export const uploadImage = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ success: false, message: "Product image is required" });
      return;
    }

    const imageUrl = `/uploads/products/${req.file.filename}`;

    res.status(201).json({
      success: true,
      message: "Product image uploaded",
      data: { imageUrl },
    });
  },
);
