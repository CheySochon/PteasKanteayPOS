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

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

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

  if (!user) {
    throw new Error("Invalid credentials");
  }

  // ── Check lockout from Database ──────────────────────────────────────
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMs = user.lockedUntil.getTime() - Date.now();
    const remainingMins = Math.ceil(remainingMs / (60 * 1000));
    throw new Error(
      `ACCOUNT_LOCKED:${remainingMins}`
    );
  }

  if (!user.isActive) {
    throw new Error("Account is disabled");
  }

  const isValid = await comparePassword(password, user.password);

  if (!isValid) {
    // ── Record failed attempt in Database ──────────────────────────────
    const newAttempts = (user.failedLoginAttempts ?? 0) + 1;
    const shouldLock = newAttempts >= MAX_ATTEMPTS;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
      : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: newAttempts,
        ...(shouldLock ? { lockedUntil } : {}),
      },
    });

    if (shouldLock) {
      throw new Error(`ACCOUNT_LOCKED:${LOCKOUT_MINUTES}`);
    }

    const attemptsLeft = MAX_ATTEMPTS - newAttempts;
    throw new Error(
      `Invalid credentials. ${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} remaining before lockout.`
    );
  }

  // ── Login success — reset counter ─────────────────────────────────────
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
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

export const resetUserPasswordWithoutCurrent = async (
  email: string,
  newPassword: string,
) => {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const newPasswordHash = await hashPassword(newPassword);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      password: newPasswordHash,
      updatedAt: new Date(),
    },
  });

  return {
    user: updatedUser,
  };
};

export const loginWithPin = async (pin: string) => {
  const user = await prisma.user.findFirst({
    where: {
      pin: pin.trim(),
      deletedAt: null,
    },
    include: { role: true },
  });

  if (!user) {
    throw new Error("Invalid PIN");
  }

  if (!user.isActive) {
    throw new Error("Account is disabled");
  }

  const token = signToken({
    userId: user.id,
    role: user.role.name,
  });

  return { user, token };
};
