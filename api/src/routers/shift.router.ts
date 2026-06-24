import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { Role } from "../prisma/client.js";
import { startShiftSchema, endShiftSchema } from "../schemas/shift.schema.js";
import { list, start, end } from "../controllers/shift.controller.js";

const router = Router();
const staffRoles = [
  authMiddleware,
  roleMiddleware([Role.ADMIN, Role.MANAGER, Role.CASHIER]),
];

router.get("/", ...staffRoles, asyncHandler(list));
router.post("/start", ...staffRoles, validate(startShiftSchema), asyncHandler(start));
router.put("/:id/end", ...staffRoles, validate(endShiftSchema), asyncHandler(end));

export default router;
