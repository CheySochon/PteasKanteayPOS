import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  registerSchema,
  loginSchema,
  updatePasswordSchema,
} from "../schemas/auth.schema.js";
import {
  register,
  login,
  logout,
  me,
  updatePassword,
  resetPassword,
  getPublicStaff,
  loginPin,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", validate(registerSchema), asyncHandler(register));
router.post("/login", validate(loginSchema), asyncHandler(login));
router.post("/logout", asyncHandler(logout));
router.post("/reset-password", asyncHandler(resetPassword));
router.get("/staff", asyncHandler(getPublicStaff));
router.post("/login-pin", asyncHandler(loginPin));
router.get("/me", authMiddleware, me);
router.patch(
  "/update-password",
  authMiddleware,
  validate(updatePasswordSchema),
  asyncHandler(updatePassword),
);

export default router;
