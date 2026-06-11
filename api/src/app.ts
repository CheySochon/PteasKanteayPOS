import express from "express";
import cookieParser from "cookie-parser";
import authRouter from "./routers/auth.router.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("API is running");
});

app.use("/auth", authRouter);

export default app;
