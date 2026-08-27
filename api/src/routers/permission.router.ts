import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { list, getCategorized, create } from "../controllers/permission.controller.js";

const router = Router();
const adminOnly = [authMiddleware, roleMiddleware(["Admin"])];

router.get("/", ...adminOnly, asyncHandler(list));
router.get("/categorized", ...adminOnly, asyncHandler(getCategorized));
router.post("/", ...adminOnly, asyncHandler(create));

export default router;
