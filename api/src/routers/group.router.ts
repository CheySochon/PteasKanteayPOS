import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createGroupSchema,
  updateGroupSchema,
} from "../schemas/group.schema.js";
import {
  list,
  getOne,
  create,
  update,
  remove,
  assignUsers,
} from "../controllers/group.controller.js";

const router = Router();
const adminOnly = [authMiddleware, roleMiddleware(["Admin"])];

router.get("/", ...adminOnly, asyncHandler(list));
router.get("/:id", ...adminOnly, asyncHandler(getOne));
router.post("/", ...adminOnly, validate(createGroupSchema), asyncHandler(create));
router.put("/:id", ...adminOnly, validate(updateGroupSchema), asyncHandler(update));
router.delete("/:id", ...adminOnly, asyncHandler(remove));
router.post("/:id/users", ...adminOnly, asyncHandler(assignUsers));

export default router;
