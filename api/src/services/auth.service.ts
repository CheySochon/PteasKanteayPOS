import { prisma } from "../config/prisma.js";
import { hashPassword, comparePassword } from "../utils/bcrypt.js";
import { signToken } from "../utils/jwt.js";
import { Role } from "../prisma/client.js";

export const register = async (data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
}) => {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new Error("Email already in use");
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role ?? "WAITER",
    },
  });

  const token = signToken({
    userId: user.id,
    role: user.role,
  });

  return { user, token };
};

export const login = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.isActive) {
    throw new Error("Invalid credentials");
  }

  const isValid = await comparePassword(password, user.passwordHash);

  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = signToken({
    userId: user.id,
    role: user.role,
  });

  return { user, token };
};

export const updatePassword = async (
  userId: string,
  data: {
    currentPassword: string;
    newPassword: string;
  },
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const isValid = await comparePassword(
    data.currentPassword,
    user.passwordHash,
  );

  if (!isValid) {
    throw new Error("Current password is incorrect");
  }

  const isSamePassword = await comparePassword(
    data.newPassword,
    user.passwordHash,
  );

  if (isSamePassword) {
    throw new Error("New password must be different from current password");
  }

  const newPasswordHash = await hashPassword(data.newPassword);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newPasswordHash,
      passwordChangedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return {
    user: updatedUser,
  };
};
