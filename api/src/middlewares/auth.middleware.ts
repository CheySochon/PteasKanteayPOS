import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies?.access_token as unknown;

    if (!token || typeof token !== "string") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = verifyToken(token);

    req.user = decoded;

    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};
