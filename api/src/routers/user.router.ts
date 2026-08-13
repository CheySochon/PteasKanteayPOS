import { Router } from "express";
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

router.get("/", ...adminOnly, asyncHandler(list));
router.get("/roles", ...adminOnly, asyncHandler(roles));
router.post("/roles", ...adminOnly, asyncHandler(createRoleHandler));
router.put("/roles/:id", ...adminOnly, asyncHandler(updateRoleHandler));
router.delete("/roles/:id", ...adminOnly, asyncHandler(removeRoleHandler));
router.post("/upload-image", ...adminOnly, uploadUserImage.single("image"), asyncHandler(uploadImage));
router.post("/", ...adminOnly, validate(createUserSchema), asyncHandler(create));
router.put("/:id", ...adminOnly, validate(updateUserSchema), asyncHandler(update));
router.delete("/:id", ...adminOnly, asyncHandler(remove));

export default router;
