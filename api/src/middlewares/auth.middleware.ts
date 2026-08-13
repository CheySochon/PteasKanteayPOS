import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    let token: string | undefined;

    if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      token = req.cookies?.access_token as string | undefined;
    }

    if (!token || typeof token !== "string") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = verifyToken(token);

    req.user = decoded;

    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};
