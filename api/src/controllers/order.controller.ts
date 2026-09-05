import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  addOrderItem,
  splitBill,
  getActiveOrdersByQrToken,
  updateOrder as updateOrderService,
} from "../services/order.service.js";
import {
  CreateOrderBody,
  UpdateOrderStatusBody,
  AddOrderItemBody,
  SplitBillBody,
} from "../schemas/order.schema.js";
import { verifyToken } from "../utils/jwt.js";

function getUserIdFromReq(req: Request<any, any, any>): number | undefined {
  let userId = req.user?.userId;
  if (!userId) {
    let token = (req.cookies as Record<string, string> | undefined)?.access_token;
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }
    if (token) {
      try {
        const decoded = verifyToken(token);
        userId = decoded?.userId;
      } catch {
        // Ignore invalid token
      }
    }
  }
  return userId;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const data = await listOrders(req.query as Record<string, string>);
  res.json({ success: true, message: "Orders fetched", data });
});

export const get = asyncHandler(
  async (req: Request<{ id: string }>, res: Response) => {
    const data = await getOrder(Number(req.params.id));
    res.json({ success: true, message: "Order fetched", data });
  },
);

export const create = asyncHandler(
  async (req: Request<object, object, CreateOrderBody>, res: Response) => {
    const userId = getUserIdFromReq(req);
    const data = await createOrder(req.body, userId);
    const io = req.app.get("io") as { emit: (event: string, data: unknown) => void } | undefined;
    if (io) {
      io.emit("order:created", data);
      io.emit("order:new", data);
    }
    res.status(201).json({ success: true, message: "Order created", data });
  },
);

export const updateStatus = asyncHandler(
  async (
    req: Request<{ id: string }, object, UpdateOrderStatusBody>,
    res: Response,
  ) => {
    const userId = getUserIdFromReq(req);
    const data = await updateOrderStatus(Number(req.params.id), req.body.status, userId);
    const io = req.app.get("io") as { emit: (event: string, data: unknown) => void } | undefined;
    if (io) {
      io.emit("order:updated", data);
    }
    res.json({ success: true, message: "Order status updated", data });
  },
);

export const remove = asyncHandler(
  async (req: Request<{ id: string }>, res: Response) => {
    const userId = getUserIdFromReq(req);
    await deleteOrder(Number(req.params.id), userId);
    res.json({ success: true, message: "Order deleted" });
  },
);

export const addItem = asyncHandler(
  async (
    req: Request<{ id: string }, object, AddOrderItemBody>,
    res: Response,
  ) => {
    const data = await addOrderItem(Number(req.params.id), req.body);
    res.status(201).json({ success: true, message: "Order item added", data });
  },
);

export const splitBillHandler = asyncHandler(
  async (
    req: Request<{ id: string }, object, SplitBillBody>,
    res: Response,
  ) => {
    const data = await splitBill(Number(req.params.id), req.body.splits ?? []);
    res.json({ success: true, message: "Split bill calculated", data });
  },
);

export const getActiveOrdersByQr = asyncHandler(
  async (req: Request<{ qrToken: string }>, res: Response) => {
    const data = await getActiveOrdersByQrToken(req.params.qrToken);
    res.json({ success: true, message: "Active orders fetched", data });
  },
);

export const update = asyncHandler(
  async (req: Request<{ id: string }, object, any>, res: Response) => {
    const userId = getUserIdFromReq(req);
    const data = await updateOrderService(Number(req.params.id), req.body, userId);
    const io = req.app.get("io") as { emit: (event: string, data: unknown) => void } | undefined;
    if (io) {
      io.emit("order:updated", data);
    }
    res.json({ success: true, message: "Order updated successfully", data });
  },
);

