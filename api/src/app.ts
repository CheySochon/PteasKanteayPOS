import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import authRouter from "./routers/auth.router.js";
import userRouter from "./routers/user.router.js";
import groupRouter from "./routers/group.router.js";
import permissionRouter from "./routers/permission.router.js";
import categoryRouter from "./routers/category.router.js";
import productRouter from "./routers/product.router.js";
import tableRouter from "./routers/table.router.js";
import orderRouter from "./routers/order.router.js";
import reportRouter from "./routers/report.router.js";
import settingRouter from "./routers/setting.router.js";
import backupRouter from "./routers/backup.router.js";
import auditRouter from "./routers/audit.router.js";
import inventoryRouter from "./routers/inventory.router.js";
import supplierRouter from "./routers/supplier.router.js";
import purchaseOrderRouter from "./routers/purchaseOrder.router.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();
app.disable("x-powered-by");

/**
 * Security headers (basic HTTP hardening)
 */
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        baseUri: ["'self'"],
      },
    },
  }),
);

/**
 * CORS (frontend access + cookie support)
 */
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

/**
 * HTTP request logging (development only)
 */
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

/**
 * Global rate limit (basic abuse protection)
 */
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "production" ? 100 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalRateLimit);

/**
 * Parsers (JSON, URL-encoded, cookies)
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

/**
 * Auth rate limit (brute force protection for auth routes)
 */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "production" ? 15 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again after 15 minutes.",
  },
});

/**
 * API routes
 */
app.use("/api/auth", authRateLimit, authRouter);

/**
 * Feature API routes
 */
app.use("/api/users", userRouter);

// Group & Permission Management Endpoints (mounted under all path prefixes for full compatibility)
app.use("/api/groups", groupRouter);
app.use("/api/admin/groups", groupRouter);
app.use("/groups", groupRouter);
app.use("/admin/groups", groupRouter);

app.use("/api/permissions", permissionRouter);
app.use("/api/admin/permissions", permissionRouter);
app.use("/permissions", permissionRouter);
app.use("/admin/permissions", permissionRouter);

app.use("/api/categories", categoryRouter);
app.use("/api/products", productRouter);
app.use("/api/tables", tableRouter);
app.use("/api/orders", orderRouter);
app.use("/api/reports", reportRouter);
app.use("/api/settings", settingRouter);
app.use("/api/backups", backupRouter);
app.use("/api/audit", auditRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/suppliers", supplierRouter);
app.use("/api/purchase-orders", purchaseOrderRouter);

/**
 * Health check endpoints
 */
app.get("/", (_, res) => res.send("OK"));
app.get("/health", (_, res) => res.json({ status: "OK" }));

/**
 * Error test route (development/debug only)
 */
app.get("/error", (_, __, next) => {
  next(new Error("Error"));
});

/**
 * 404 handler (unknown routes)
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Not found",
  });
});

/**
 * Global error handler (final fallback)
 */
app.use(errorMiddleware);

export default app;
