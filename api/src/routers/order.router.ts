import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  addOrderItemSchema,
  splitBillSchema,
} from "../schemas/order.schema.js";
import {
  list,
  get,
  create,
  updateStatus,
  remove,
  addItem,
  splitBillHandler,
  getActiveOrdersByQr,
  update,
} from "../controllers/order.controller.js";

const router = Router();
const staffRoles = [
  authMiddleware,
  roleMiddleware(["Admin", "Manager", "Cashier", "Staff"]),
];

router.get("/", ...staffRoles, asyncHandler(list));
router.get("/qr/:qrToken", asyncHandler(getActiveOrdersByQr));
router.get("/:id", ...staffRoles, asyncHandler(get));
router.post("/", validate(createOrderSchema), asyncHandler(create));
router.put("/:id", ...staffRoles, asyncHandler(update));
router.put(
  "/:id/status",
  ...staffRoles,
  validate(updateOrderStatusSchema),
  asyncHandler(updateStatus),
);
router.delete("/:id", ...staffRoles, asyncHandler(remove));
router.post(
  "/:id/items",
  ...staffRoles,
  validate(addOrderItemSchema),
  asyncHandler(addItem),
);
router.post(
  "/:id/split-bill",
  ...staffRoles,
  validate(splitBillSchema),
  asyncHandler(splitBillHandler),
);

export default router;
