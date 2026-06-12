import express from "express";
import cookieParser from "cookie-parser";
import authRouter from "./routers/auth.router.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);

app.get("/", (_, res) => {
  res.send("ok");
});

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.get("/error", (req, res, next) => {
  const error = new Error("error");
  next(error);
});

app.use(errorMiddleware);

export default app;
