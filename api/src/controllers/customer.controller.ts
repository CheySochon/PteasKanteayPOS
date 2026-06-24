import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  getCustomerOrders,
} from "../services/customer.service.js";
import {
  CreateCustomerBody,
  UpdateCustomerBody,
} from "../schemas/customer.schema.js";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const data = await listCustomers();
  res.json({ success: true, message: "Customers fetched", data });
});

export const get = asyncHandler(
  async (req: Request<{ id: string }>, res: Response) => {
    const data = await getCustomer(Number(req.params.id));
    res.json({ success: true, message: "Customer fetched", data });
  },
);

export const create = asyncHandler(
  async (req: Request<object, object, CreateCustomerBody>, res: Response) => {
    const data = await createCustomer(req.body);
    res.status(201).json({ success: true, message: "Customer created", data });
  },
);

export const update = asyncHandler(
  async (
    req: Request<{ id: string }, object, UpdateCustomerBody>,
    res: Response,
  ) => {
    const data = await updateCustomer(Number(req.params.id), req.body);
    res.json({ success: true, message: "Customer updated", data });
  },
);

export const orders = asyncHandler(
  async (req: Request<{ id: string }>, res: Response) => {
    const data = await getCustomerOrders(Number(req.params.id));
    res.json({ success: true, message: "Customer orders fetched", data });
  },
);
