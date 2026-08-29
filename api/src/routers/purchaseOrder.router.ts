import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { list, create, receive } from "../controllers/purchaseOrder.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/", list);
router.post("/", create);
router.post("/:id/receive", receive);

export default router;
