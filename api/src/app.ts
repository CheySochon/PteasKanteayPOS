import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

import authRouter from "./routers/auth.router.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();

/**
 * Security headers (basic HTTP hardening)
 */
app.use(helmet());

/**
 * CORS (frontend access + cookie support)
 */
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.CLIENT_URL
        : "http://localhost:3000",
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
  limit: 100,
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

/**
 * Auth rate limit (brute force protection for auth routes)
 */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * API routes
 */
app.use("/api/auth", authRateLimit, authRouter);

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
