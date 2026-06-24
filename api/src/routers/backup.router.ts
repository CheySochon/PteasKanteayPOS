import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { Role } from "../prisma/client.js";
import {
  download,
  list,
  latest,
  preview,
  restore,
} from "../controllers/backup.controller.js";

const router = Router();
const adminOnly = [authMiddleware, roleMiddleware([Role.ADMIN])];

router.get("/", ...adminOnly, asyncHandler(list));
router.get("/download", ...adminOnly, asyncHandler(download));
router.get("/latest", ...adminOnly, asyncHandler(latest));
router.post("/preview", ...adminOnly, asyncHandler(preview));
router.post("/restore", ...adminOnly, asyncHandler(restore));

export default router;
