import { Role } from "../prisma/client.js";

export type JwtPayload = {
  userId: string;
  role: Role;
};
