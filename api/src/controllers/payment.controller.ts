import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listPayments,
  listOrderPayments,
  createPayment,
} from "../services/payment.service.js";
import { CreatePaymentBody } from "../schemas/payment.schema.js";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const data = await listPayments();
  res.json({ success: true, message: "Payments fetched", data });
});

export const create = asyncHandler(
  async (req: Request<object, object, CreatePaymentBody>, res: Response) => {
    const data = await createPayment(req.body, req.user?.userId);
    res.status(201).json({ success: true, message: "Payment created", data });
  },
);

export const listByOrder = asyncHandler(
  async (req: Request<{ orderId: string }>, res: Response) => {
    const data = await listOrderPayments(Number(req.params.orderId));
    res.json({ success: true, message: "Order payments fetched", data });
  },
);
