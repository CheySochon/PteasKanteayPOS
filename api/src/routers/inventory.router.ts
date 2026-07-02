import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createIngredientSchema,
  updateIngredientSchema,
  stockAdjustmentSchema,
} from "../schemas/inventory.schema.js";
import {
  listIngredientsHandler,
  createIngredientHandler,
  updateIngredientHandler,
  deleteIngredientHandler,
  listStockMovementsHandler,
  stockAdjustmentHandler,
  lowStockHandler,
} from "../controllers/inventory.controller.js";

const router = Router();
const inventoryRoles = [
  authMiddleware,
  roleMiddleware(["Admin", "Manager"]),
];

router.get("/ingredients", asyncHandler(listIngredientsHandler));
router.post(
  "/ingredients",
  ...inventoryRoles,
  validate(createIngredientSchema),
  asyncHandler(createIngredientHandler),
);
router.put(
  "/ingredients/:id",
  ...inventoryRoles,
  validate(updateIngredientSchema),
  asyncHandler(updateIngredientHandler),
);
router.delete(
  "/ingredients/:id",
  ...inventoryRoles,
  asyncHandler(deleteIngredientHandler),
);
router.get("/stock-movements", asyncHandler(listStockMovementsHandler));
router.post(
  "/stock-adjustment",
  ...inventoryRoles,
  validate(stockAdjustmentSchema),
  asyncHandler(stockAdjustmentHandler),
);
router.get("/low-stock", asyncHandler(lowStockHandler));

export default router;
