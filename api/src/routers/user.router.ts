import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { Role } from "../prisma/client.js";
import {
  createUserSchema,
  updateUserSchema,
} from "../schemas/user.schema.js";
import { list, create, update, remove } from "../controllers/user.controller.js";

const router = Router();
const adminOnly = [authMiddleware, roleMiddleware([Role.ADMIN])];

router.get("/", ...adminOnly, asyncHandler(list));
router.post("/", ...adminOnly, validate(createUserSchema), asyncHandler(create));
router.put("/:id", ...adminOnly, validate(updateUserSchema), asyncHandler(update));
router.delete("/:id", ...adminOnly, asyncHandler(remove));

export default router;
