import { Request, Response, NextFunction } from "express";
import { Role } from "../prisma/client.js";

export const roleMiddleware =
  (allowedRoles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const userRole = req.user.role;

    if (userRole !== Role.ADMIN && !allowedRoles.includes(userRole)) {
      return res
        .status(403)
        .json({ success: false, message: "Insufficient permissions" });
    }

    return next();
  };
