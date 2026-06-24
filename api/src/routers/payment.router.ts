import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { Role } from "../prisma/client.js";
import { createPaymentSchema } from "../schemas/payment.schema.js";
import { list, create } from "../controllers/payment.controller.js";

const router = Router();
const cashierRoles = [
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.CASHIER]),
];

router.get("/", ...cashierRoles, asyncHandler(list));
router.post("/", ...cashierRoles, validate(createPaymentSchema), asyncHandler(create));

export default router;
