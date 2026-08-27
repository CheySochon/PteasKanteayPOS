import { Request, Response, NextFunction } from "express";
import { hasPermission } from "../utils/rbac.js";

export const permissionMiddleware =
  (permissionCode: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    // Super admin bypass or check permission
    if (req.user.userId === 1) {
      return next();
    }

    try {
      const allowed = await hasPermission(req.user.userId, permissionCode);
      if (allowed) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: `Forbidden: Missing required permission [${permissionCode}]`,
      });
    } catch (_err) {
      return res
        .status(500)
        .json({ success: false, message: "Error checking permissions" });
    }
  };

export const requirePermission = permissionMiddleware;
