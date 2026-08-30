import { Router, Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createUserSchema,
  updateUserSchema,
} from "../schemas/user.schema.js";
import { list, create, update, remove, roles, uploadImage, createRoleHandler, updateRoleHandler, removeRoleHandler } from "../controllers/user.controller.js";
import { uploadUserImage } from "../middlewares/upload.middleware.js";

const router = Router();
const adminOnly = [authMiddleware, roleMiddleware(["Admin"])];

// Middleware allowing any staff member to update their own profile, or Admin for other users
const selfOrAdminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.userId) {
    return res
      .status(401)
      .json({ success: false, message: "Authentication required" });
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const targetUserId = parseInt(rawId || "0", 10);
  if (req.user.userId === targetUserId) {
    return next();
  }

  return roleMiddleware(["Admin"])(req, res, next);
};

router.get("/", ...adminOnly, asyncHandler(list));
router.get("/roles", ...adminOnly, asyncHandler(roles));
router.post("/roles", ...adminOnly, asyncHandler(createRoleHandler));
router.put("/roles/:id", ...adminOnly, asyncHandler(updateRoleHandler));
router.delete("/roles/:id", ...adminOnly, asyncHandler(removeRoleHandler));
router.post("/upload-image", authMiddleware, uploadUserImage.single("image"), asyncHandler(uploadImage));
router.post("/", ...adminOnly, validate(createUserSchema), asyncHandler(create));
router.put("/:id", authMiddleware, selfOrAdminMiddleware, validate(updateUserSchema), asyncHandler(update));
router.delete("/:id", ...adminOnly, asyncHandler(remove));

export default router;
