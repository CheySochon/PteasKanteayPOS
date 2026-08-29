import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import {
  RegisterBody,
  LoginBody,
  UpdatePasswordBody,
} from "../schemas/auth.schema.js";
import {
  register as registerUser,
  login as loginUser,
  updatePassword as updateUserPassword,
  resetUserPasswordWithoutCurrent,
  loginWithPin,
} from "../services/auth.service.js";
import { createAuditLog } from "../services/audit.service.js";
import { getUserPermissions } from "../utils/rbac.js";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

export const register = async (
  req: Request<object, object, RegisterBody>,
  res: Response,
) => {
  try {
    const { user, token } = await registerUser(req.body);

    res.cookie("access_token", token, cookieOptions);

    res.status(201).json({
      success: true,
      user,
      token,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed";

    res.status(400).json({
      success: false,
      message,
    });
  }
};

export const login = async (
  req: Request<object, object, LoginBody>,
  res: Response,
) => {
  const ipAddress = (req.headers["x-forwarded-for"] as string) || req.ip || req.socket.remoteAddress || "Localhost";
  const userAgent = req.headers["user-agent"] || "Browser";

  try {
    const { user, token } = await loginUser(req.body.email, req.body.password);

    res.cookie("access_token", token, cookieOptions);

    const loginTimeISO = new Date().toISOString();

    // Persist latest login timestamp to DB
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { updatedAt: new Date() },
      });
    } catch (_dbErr) {
      // ignore
    }

    // Record Successful Login Audit Log
    try {
      await createAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: typeof user.role === "string" ? user.role : (user.role as any)?.name || "Staff",
        action: "LOGIN",
        status: "SUCCESS",
        ipAddress,
        userAgent,
      });
    } catch (_auditErr) {
      // ignore
    }

    // Emit Socket.io Login Event for real-time alerts
    try {
      const io = req.app.get("io");
      if (io) {
        const payload = {
          id: user.id,
          userId: user.id,
          userName: user.name,
          userRole: typeof user.role === "string" ? user.role : (user.role as any)?.name || "Staff",
          loginTime: loginTimeISO,
          updatedAt: loginTimeISO,
        };
        io.emit("auth:login", payload);
        io.emit("user:login", payload);
        io.emit("user:updated", payload);
      }
    } catch (_err) {
      // ignore
    }

    res.json({
      success: true,
      user,
      token,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Login failed";

    // Record Failed Login Audit Log
    try {
      await createAuditLog({
        userName: req.body.email || "Unknown User",
        userRole: "Guest",
        action: "FAILED_LOGIN",
        status: "FAILED",
        ipAddress,
        userAgent,
        details: message,
      });
    } catch (_auditErr) {
      // ignore
    }

    res.status(401).json({
      success: false,
      message,
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  let user: any = null;
  try {
    let token = req.cookies?.access_token as string | undefined;
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }
    if (token) {
      const { verifyToken } = await import("../utils/jwt.js");
      const decoded = verifyToken(token);
      if (decoded && decoded.userId) {
        const userDb = await prisma.user.findUnique({
          where: { id: decoded.userId },
        });
        if (userDb) {
          user = {
            id: userDb.id,
            name: userDb.name,
            role: decoded.role,
          };
        }
      }
    }
  } catch (_err) {
    // ignore
  }

  res.clearCookie("access_token");

  // Emit Socket.io Logout Event
  if (user) {
    try {
      const io = req.app.get("io");
      if (io) {
        io.emit("auth:logout", {
          userId: user.id,
          userName: user.name,
          userRole: user.role,
        });
      }
    } catch (_err) {
      // ignore
    }
  }

  res.json({
    success: true,
    message: "Logged out successfully",
  });
};

export const me = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userGroups: {
          include: {
            group: {
              include: {
                groupPermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    const groups = user.userGroups.map((ug) => ug.group);
    const primaryGroup = groups[0];
    const primaryGroupName = primaryGroup?.name || "Staff";
    const permissions = await getUserPermissions(userId);

    const data = {
      ...user,
      groups,
      permissions,
      role: {
        id: primaryGroup?.id || 1,
        name: primaryGroupName,
        description: primaryGroup?.description || `${primaryGroupName} Group`,
        permissions,
      },
      roleName: primaryGroupName,
    };

    res.json({
      success: true,
      data,
    });
  } catch (_err: unknown) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updatePassword = async (
  req: Request<object, object, UpdatePasswordBody>,
  res: Response,
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });

      return;
    }

    const { currentPassword, newPassword } = req.body;

    const { user } = await updateUserPassword(userId, {
      currentPassword,
      newPassword,
    });

    res.clearCookie("access_token");

    res.json({
      success: true,
      message: "Password updated successfully",
      user,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Password update failed";

    res.status(400).json({
      success: false,
      message,
    });
  }
};

export const resetPassword = async (
  req: Request<object, object, { email?: string; newPassword?: string }>,
  res: Response,
) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      res.status(400).json({
        success: false,
        message: "Email and new password are required",
      });
      return;
    }

    const { user } = await resetUserPasswordWithoutCurrent(email, newPassword);

    res.json({
      success: true,
      message: "Password updated successfully in database",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Password reset failed";

    res.status(400).json({
      success: false,
      message,
    });
  }
};

export const getPublicStaff = async (
  _req: Request,
  res: Response,
) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        pin: true,
        imageUrl: true,
        userGroups: {
          select: {
            group: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    const formatted = (users || []).map((u) => {
      const groupName = u.userGroups?.[0]?.group?.name || "Staff";
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        pin: u.pin,
        imageUrl: u.imageUrl,
        role: { name: groupName },
        roleName: groupName,
      };
    });

    res.json({
      success: true,
      data: formatted,
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch staff list",
    });
  }
};

export const loginPin = async (
  req: Request<object, object, { pin: string; userId?: number; email?: string }>,
  res: Response,
) => {
  try {
    const { pin, userId, email } = req.body;
    if (!pin) {
      res.status(400).json({ success: false, message: "PIN is required" });
      return;
    }

    const { user, token } = await loginWithPin(pin, userId, email);

    // Set cookie
    res.cookie("access_token", token, cookieOptions);

    const loginTimeISO = new Date().toISOString();

    // Persist latest login timestamp to DB
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { updatedAt: new Date() },
      });
    } catch (_dbErr) {
      // ignore
    }

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role.name,
      action: "LOGIN_PIN",
      status: "SUCCESS",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      details: `Logged in via PIN code`,
    });

    // Emit Socket.io Login Event for real-time alerts
    try {
      const io = req.app.get("io");
      if (io) {
        const payload = {
          id: user.id,
          userId: user.id,
          userName: user.name,
          userRole: user.role.name,
          loginTime: loginTimeISO,
          updatedAt: loginTimeISO,
        };
        io.emit("auth:login", payload);
        io.emit("user:login", payload);
        io.emit("user:updated", payload);
      }
    } catch (_err) {
      // ignore
    }

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name,
          roleName: user.role.name.toUpperCase(),
          permissions: user.permissions,
        },
      },
    });
  } catch (err: any) {
    res.status(401).json({
      success: false,
      message: err?.message || "Invalid PIN",
    });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    let token = req.cookies?.refresh_token as string | undefined;
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Refresh token required" });
    }

    const { verifyRefreshToken, signToken } = await import("../utils/jwt.js");
    const decoded = verifyRefreshToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        userGroups: {
          include: {
            group: true,
          },
        },
      },
    });

    if (!user || user.deletedAt || !user.isActive) {
      return res.status(401).json({ success: false, message: "User disabled or not found" });
    }

    const groupName = user.userGroups[0]?.group?.name || "Cashier";
    const newToken = signToken({
      userId: user.id,
      role: groupName,
    });

    res.cookie("access_token", newToken, cookieOptions);

    return res.json({
      success: true,
      token: newToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: groupName,
      },
    });
  } catch (_err) {
    return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
  }
};
