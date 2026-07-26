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
} from "../services/auth.service.js";
import { createAuditLog } from "../services/audit.service.js";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 12 * 60 * 60 * 1000,
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

    res.json({
      success: true,
      user,
      token,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Login failed";

    // Record Failed Login Audit Log & Telegram Warning Alert
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

export const logout = (_: Request, res: Response) => {
  res.clearCookie("access_token");

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
      include: { role: true },
    });
    if (!user || user.deletedAt) {
      return res.status(401).json({ success: false, message: "User not found" });
    }
    res.json({
      success: true,
      data: user,
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
