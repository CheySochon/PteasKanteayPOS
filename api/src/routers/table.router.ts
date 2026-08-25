import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createTableSchema,
  updateTableSchema,
  moveTableSchema,
  mergeTableSchema,
} from "../schemas/table.schema.js";
import {
  list,
  create,
  update,
  remove,
  qrMenu,
  qrCode,
  move,
  merge,
  unmerge,
} from "../controllers/table.controller.js";

const router = Router();
const adminOnly = [authMiddleware, roleMiddleware(["Admin"])];
const staffOrAdmin = [authMiddleware, roleMiddleware(["Admin", "Cashier", "Staff"])];

router.get("/", asyncHandler(list));
router.post("/", ...adminOnly, validate(createTableSchema), asyncHandler(create));
router.post("/move", ...staffOrAdmin, validate(moveTableSchema), asyncHandler(move));
router.post("/merge", ...staffOrAdmin, validate(mergeTableSchema), asyncHandler(merge));
router.post("/:id/unmerge", ...staffOrAdmin, asyncHandler(unmerge));
router.put("/:id", ...adminOnly, validate(updateTableSchema), asyncHandler(update));

router.delete("/:id", ...adminOnly, asyncHandler(remove));
router.get("/:qrToken/qr-code", asyncHandler(qrCode));
router.get("/:qrToken/menu", asyncHandler(qrMenu));

export default router;

