import { Router } from "express";
import { register, login, logout, me } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/logout", logout);

router.get("/me", authMiddleware, me);

export default router;
