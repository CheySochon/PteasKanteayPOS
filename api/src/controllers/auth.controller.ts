import { Request, Response } from "express";
import {
  register as registerUser,
  login as loginUser,
} from "../services/auth.service.js";
import { RegisterBody, LoginBody } from "../types/auth.type.js";

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
    const message = err instanceof Error ? err.message : "Unknown error";

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
    const { email, password } = req.body;

    const { user, token } = await loginUser(email, password);

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
  });
};

export const me = (req: Request, res: Response) => {
  res.json({
    success: true,
    user: req.user,
  });
};
