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
      userRole !== "superadmin" &&
      userRole !== "admin" &&
      !allowed.includes(userRole)
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Insufficient permissions" });
    }

    return next();
  };
