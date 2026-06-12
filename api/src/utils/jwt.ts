import jwt, { SignOptions } from "jsonwebtoken";
import { JwtPayload } from "../types/jwt.type.js";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN: SignOptions["expiresIn"] = process.env
  .JWT_EXPIRES_IN as SignOptions["expiresIn"];

export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
