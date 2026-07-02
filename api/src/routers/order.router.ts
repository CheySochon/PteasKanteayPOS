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
} from "../controllers/order.controller.js";
import { listByOrder } from "../controllers/payment.controller.js";

const router = Router();
const staffRoles = [
  authMiddleware,
  roleMiddleware(["Admin", "Manager", "Cashier"]),
];

router.get("/", asyncHandler(list));
router.get("/:id", asyncHandler(get));
router.post("/", validate(createOrderSchema), asyncHandler(create));
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
router.get("/:orderId/payments", ...staffRoles, asyncHandler(listByOrder));

export default router;
