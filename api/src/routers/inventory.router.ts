import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  adjustStockSchema,
  updateInventorySettingsSchema,
  addInventoryItemSchema,
} from "../schemas/inventory.schema.js";
import {
  getInventory,
  adjustInventoryStock,
  updateInventoryConfig,
  getTransactions,
  createInventoryItem,
} from "../controllers/inventory.controller.js";

const router = Router();
const adminOnly = [authMiddleware, roleMiddleware(["Admin"])];
const allAuthorized = [authMiddleware];

router.get("/", ...allAuthorized, asyncHandler(getInventory));
router.get("/transactions", ...allAuthorized, asyncHandler(getTransactions));
router.post("/adjust", ...adminOnly, validate(adjustStockSchema), asyncHandler(adjustInventoryStock));
router.put("/settings", ...adminOnly, validate(updateInventorySettingsSchema), asyncHandler(updateInventoryConfig));
router.post("/item", ...adminOnly, validate(addInventoryItemSchema), asyncHandler(createInventoryItem));

export default router;
