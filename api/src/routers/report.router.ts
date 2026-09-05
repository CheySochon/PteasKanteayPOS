import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import {
  dailySales,
  monthlySales,
  topProducts,
  purchaseSummary,
  paymentBreakdown,
  exportCsvHandler,
} from "../controllers/report.controller.js";

const router = Router();
const reportRoles = [
  authMiddleware,
  roleMiddleware(["Admin", "Manager", "Cashier"]),
];

router.get("/daily-sales", ...reportRoles, asyncHandler(dailySales));
router.get("/monthly-sales", ...reportRoles, asyncHandler(monthlySales));
router.get("/top-products", ...reportRoles, asyncHandler(topProducts));
router.get("/purchase-summary", ...reportRoles, asyncHandler(purchaseSummary));
router.get("/payment-breakdown", ...reportRoles, asyncHandler(paymentBreakdown));
router.get("/export-csv", ...reportRoles, asyncHandler(exportCsvHandler));

export default router;
