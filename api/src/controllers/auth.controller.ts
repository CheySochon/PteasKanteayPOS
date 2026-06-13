import { Request, Response } from "express";
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

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
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
  try {
    const { user, token } = await loginUser(req.body.email, req.body.password);

    res.cookie("access_token", token, cookieOptions);

    res.json({
      success: true,
      user,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Login failed";

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

export const me = (req: Request, res: Response) => {
  res.json({
    success: true,
    user: req.user,
  });
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
