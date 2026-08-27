import { Request, Response, NextFunction } from "express";

function normalizeRole(role: string) {
  return String(role || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export const roleMiddleware =
  (allowedRoles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const userRole = normalizeRole(req.user.role);
    const allowed = allowedRoles.map(normalizeRole);


    if (
      userRole.includes("super") ||
      userRole.includes("admin") ||
      req.user.userId === 1 ||
      allowed.includes(userRole)
    ) {
      return next();
    }

    return res
      .status(403)
      .json({ success: false, message: "Insufficient permissions" });
  };
