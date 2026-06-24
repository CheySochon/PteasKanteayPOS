import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { Role } from "../prisma/client.js";
import {
  createProductSchema,
  updateProductSchema,
} from "../schemas/product.schema.js";
import {
  list,
  get,
  create,
  update,
  remove,
} from "../controllers/product.controller.js";

const router = Router();
const adminOnly = [authMiddleware, roleMiddleware([Role.ADMIN])];

router.get("/", asyncHandler(list));
router.get("/:id", asyncHandler(get));
router.post("/", ...adminOnly, validate(createProductSchema), asyncHandler(create));
router.put("/:id", ...adminOnly, validate(updateProductSchema), asyncHandler(update));
router.delete("/:id", ...adminOnly, asyncHandler(remove));

export default router;
