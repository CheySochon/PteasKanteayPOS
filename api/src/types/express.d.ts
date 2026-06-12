import { JwtPayload } from "./jwt.type.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
