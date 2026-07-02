import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { uploadSettingImage } from "../middlewares/upload.middleware.js";
import { updateSettingsSchema } from "../schemas/setting.schema.js";
import { list, update, uploadImage } from "../controllers/setting.controller.js";

const router = Router();
const adminOnly = [authMiddleware, roleMiddleware(["Admin"])];

router.get("/", asyncHandler(list));
router.post("/upload-image", ...adminOnly, uploadSettingImage.single("image"), asyncHandler(uploadImage));
router.put("/", ...adminOnly, validate(updateSettingsSchema), asyncHandler(update));

export default router;
