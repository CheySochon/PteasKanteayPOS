import { prisma } from "../config/prisma.js";
import { hashPassword, comparePassword } from "../utils/bcrypt.js";
import { signToken } from "../utils/jwt.js";

export const register = async (data: {
  email: string;
  password: string;
  name: string;
  role?: string;
}) => {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new Error("Email already in use");
  }

  const hashedPassword = await hashPassword(data.password);

  const roleRecord = await prisma.role.findUnique({
    where: { name: data.role ?? "Staff" },
  });

  if (!roleRecord) {
    throw new Error("Invalid role");
  }

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      roleId: roleRecord.id,
    },
    include: { role: true },
  });

  const token = signToken({
    userId: user.id,
    role: user.role.name,
  });

  return { user, token };
};

export const login = async (emailOrUsername: string, password: string) => {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: emailOrUsername, mode: "insensitive" } },
        { name: { equals: emailOrUsername, mode: "insensitive" } },
      ],
      deletedAt: null,
    },
    include: { role: true },
  });

  if (!user || !user.isActive) {
    throw new Error("Invalid credentials");
  }

  const isValid = await comparePassword(password, user.password);

  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  const token = signToken({
    userId: user.id,
    role: user.role.name,
  });

  return { user, token };
};

export const updatePassword = async (
  userId: number,
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
    user.password,
  );

  if (!isValid) {
    throw new Error("Current password is incorrect");
  }

  const isSamePassword = await comparePassword(
    data.newPassword,
    user.password,
  );

  if (isSamePassword) {
    throw new Error("New password must be different from current password");
  }

  const newPasswordHash = await hashPassword(data.newPassword);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      password: newPasswordHash,
      updatedAt: new Date(),
    },
  });

  return {
    user: updatedUser,
  };
};
