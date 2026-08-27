import { prisma } from "../config/prisma.js";
import { hashPassword, comparePassword } from "../utils/bcrypt.js";
import { signToken } from "../utils/jwt.js";
import { getUserPermissions } from "../utils/rbac.js";

async function findOrCreateGroup(groupName: string) {
  let group = await prisma.group.findUnique({
    where: { name: groupName },
  });

  if (!group) {
    group = await prisma.group.findFirst({
      where: { name: { equals: groupName, mode: "insensitive" } },
    });
  }

  if (!group) {
    group = await prisma.group.create({
      data: {
        name: groupName,
        description: `${groupName} Group`,
      },
    });
  }

  return group;
}

function formatUserWithRole(user: any) {
  if (!user) return user;

  const groups = user.userGroups?.map((ug: any) => ug.group) || [];
  const primaryGroup = groups[0];
  const primaryGroupName = primaryGroup?.name || "Staff";
  const primaryGroupId = primaryGroup?.id || 1;

  const roleObj = {
    id: primaryGroupId,
    name: primaryGroupName,
    description: primaryGroup?.description || `${primaryGroupName} Group`,
    permissions: groups.flatMap((g: any) =>
      g.groupPermissions?.map((gp: any) => gp.permission?.code).filter(Boolean) || []
    ),
  };

  return {
    ...user,
    role: roleObj,
    roleName: primaryGroupName,
    groups,
  };
}

export const register = async (data: {
  email: string;
  password: string;
  name: string;
  role?: string;
  groupName?: string;
}) => {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new Error("Email already in use");
  }

  const targetRole = data.role ?? data.groupName ?? "Staff";
  const groupRecord = await findOrCreateGroup(targetRole);

  if (!groupRecord) {
    throw new Error("Invalid role");
  }

  const hashedPassword = await hashPassword(data.password);

  const rawUser = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      userGroups: {
        create: [
          {
            groupId: groupRecord.id,
          },
        ],
      },
    },
    include: {
      userGroups: {
        include: {
          group: {
            include: {
              groupPermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const user = formatUserWithRole(rawUser);

  const token = signToken({
    userId: user.id,
    role: user.role.name,
  });

  return { user, token };
};

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export const login = async (emailOrUsername: string, password: string) => {
  const rawUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: emailOrUsername, mode: "insensitive" } },
        { name: { equals: emailOrUsername, mode: "insensitive" } },
      ],
      deletedAt: null,
    },
    include: {
      userGroups: {
        include: {
          group: {
            include: {
              groupPermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!rawUser) {
    throw new Error("Invalid credentials");
  }

  // ── Check lockout from Database ──────────────────────────────────────
  if (rawUser.lockedUntil && rawUser.lockedUntil > new Date()) {
    const remainingMs = rawUser.lockedUntil.getTime() - Date.now();
    const remainingMins = Math.ceil(remainingMs / (60 * 1000));
    throw new Error(`ACCOUNT_LOCKED:${remainingMins}`);
  }

  if (!rawUser.isActive) {
    throw new Error("Account is disabled");
  }

  const isValid = await comparePassword(password, rawUser.password);

  if (!isValid) {
    // ── Record failed attempt in Database ──────────────────────────────
    const newAttempts = (rawUser.failedLoginAttempts ?? 0) + 1;
    const shouldLock = newAttempts >= MAX_ATTEMPTS;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
      : null;

    await prisma.user.update({
      where: { id: rawUser.id },
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
  if (rawUser.failedLoginAttempts > 0 || rawUser.lockedUntil) {
    await prisma.user.update({
      where: { id: rawUser.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  const user = formatUserWithRole(rawUser);
  const permissions = await getUserPermissions(user.id);

  const token = signToken({
    userId: user.id,
    role: user.role.name,
  });

  return { user: { ...user, permissions }, token };
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

export const loginWithPin = async (pin: string, userId?: number, email?: string) => {
  const whereClause: any = {
    pin: pin.trim(),
    deletedAt: null,
  };

  if (userId) {
    whereClause.id = userId;
  } else if (email) {
    whereClause.email = email.trim().toLowerCase();
  }

  const rawUser = await prisma.user.findFirst({
    where: whereClause,
    include: {
      userGroups: {
        include: {
          group: {
            include: {
              groupPermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!rawUser) {
    throw new Error("Invalid PIN");
  }

  if (!rawUser.isActive) {
    throw new Error("Account is disabled");
  }

  const user = formatUserWithRole(rawUser);
  const permissions = await getUserPermissions(user.id);

  const token = signToken({
    userId: user.id,
    role: user.role.name,
  });

  return { user: { ...user, permissions }, token };
};
