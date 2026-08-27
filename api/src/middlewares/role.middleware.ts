import { Request, Response, NextFunction } from "express";
import { getUserGroups } from "../utils/rbac.js";

function normalizeName(str: string) {
  return String(str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export const roleMiddleware =
  (allowedRoles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    if (req.user.userId === 1) {
      return next();
    }

    const userRole = normalizeName(req.user.role || "");
    const allowed = allowedRoles.map(normalizeName);

    if (
      userRole.includes("super") ||
      userRole.includes("admin") ||
      allowed.includes(userRole)
    ) {
      return next();
    }

    try {
      const groups = await getUserGroups(req.user.userId);
      const groupNames = groups.map((g) => normalizeName(g.name));

      const hasMatchingGroup = groupNames.some((gn) =>
        allowed.some((a) => gn.includes(a) || a.includes(gn)) ||
        gn.includes("admin") ||
        gn.includes("super")
      );

      if (hasMatchingGroup) {
        return next();
      }
    } catch (_err) {
      // Fall through to 403
    }

    return res
      .status(403)
      .json({ success: false, message: "Insufficient permissions" });
  };
