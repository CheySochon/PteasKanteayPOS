import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { Role } from "../prisma/client.js";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "../schemas/customer.schema.js";
import {
  list,
  get,
  create,
  update,
  orders,
} from "../controllers/customer.controller.js";

const router = Router();
const staffRoles = [
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.MANAGER, Role.CASHIER]),
];

router.get("/", ...staffRoles, asyncHandler(list));
router.get("/:id", ...staffRoles, asyncHandler(get));
router.post("/", ...staffRoles, validate(createCustomerSchema), asyncHandler(create));
router.put("/:id", ...staffRoles, validate(updateCustomerSchema), asyncHandler(update));
router.get("/:id/orders", ...staffRoles, asyncHandler(orders));

export default router;
