import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { list, create, update, remove } from "../controllers/supplier.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/", list);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

export default router;
