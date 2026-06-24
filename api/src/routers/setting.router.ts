import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { Role } from "../prisma/client.js";
import { updateSettingsSchema } from "../schemas/setting.schema.js";
import { list, update } from "../controllers/setting.controller.js";

const router = Router();
const adminOnly = [authMiddleware, roleMiddleware([Role.ADMIN])];

router.get("/", asyncHandler(list));
router.put("/", ...adminOnly, validate(updateSettingsSchema), asyncHandler(update));

export default router;
