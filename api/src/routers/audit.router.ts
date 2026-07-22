import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import {
  getAuditLogsHandler,
  getTelegramConfigHandler,
  updateTelegramConfigHandler,
  testTelegramBotHandler,
} from "../controllers/audit.controller.js";

const router = Router();
const adminOnly = [authMiddleware, roleMiddleware(["Admin"])];

router.get("/audit-logs", ...adminOnly, asyncHandler(getAuditLogsHandler));
router.get("/telegram", ...adminOnly, asyncHandler(getTelegramConfigHandler));
router.post("/telegram", ...adminOnly, asyncHandler(updateTelegramConfigHandler));
router.post("/telegram/test", ...adminOnly, asyncHandler(testTelegramBotHandler));

export default router;
