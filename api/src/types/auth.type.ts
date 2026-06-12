import { Role } from "../prisma/client.js";

export type RegisterBody = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
};

export type LoginBody = {
  email: string;
  password: string;
};
