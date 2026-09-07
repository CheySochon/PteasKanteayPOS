import { prisma } from "../config/prisma.js";
import { hashPassword } from "../utils/bcrypt.js";
import {
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
} from "./group.service.js";

async function findOrCreateGroup(targetGroupName?: string, allowRootGroup1 = false) {
  let selectedName = (targetGroupName || "Cashier Group").trim();
  const norm = selectedName.toLowerCase();

  // 🛡️ Super Admin Protection Guard: Group ID 1 / "Admin Group" / "Admin" is EXCLUSIVELY for User ID 1 (Super Admin).
  // If allowRootGroup1 is false (non-User 1), match existing non-root admin group in DB (e.g. "Admin Update")
  if (!allowRootGroup1 && (norm === "admin" || norm === "admin group" || norm === "super admin" || norm === "super_admin")) {
    const dbAdminGroup = await prisma.group.findFirst({
      where: {
        id: { not: 1 },
        name: { contains: "Admin", mode: "insensitive" },
      },
    });
    if (dbAdminGroup) {
      return dbAdminGroup;
    }
    selectedName = "Admin Update";
  }

  let groupRecord = await prisma.group.findFirst({
    where: {
      name: { equals: selectedName, mode: "insensitive" },
      ...(allowRootGroup1 ? {} : { id: { not: 1 } }),
    },
  });

  if (!groupRecord) {
    try {
      groupRecord = await prisma.group.create({
        data: {
          name: selectedName,
          description: `${selectedName}`,
        },
      });
    } catch {
      groupRecord = await prisma.group.findFirst({
        where: {
          name: { equals: selectedName, mode: "insensitive" },
          ...(allowRootGroup1 ? {} : { id: { not: 1 } }),
        },
      });
    }
  }

  if (!groupRecord && !allowRootGroup1) {
    groupRecord = await prisma.group.findFirst({
      where: { id: { not: 1 } },
    });
  }

  if (!groupRecord) {
    groupRecord = await prisma.group.findFirst();
  }

  if (!groupRecord) {
    throw new Error("Invalid group: No groups found in system");
  }

  return groupRecord;
}

function formatUserRoleCompatibility(user: any) {
  if (!user) return user;
  let groups = user.userGroups?.map((ug: any) => ug.group) || [];

  // 🛡️ Super Admin Protection: User ID 1 ALWAYS belongs to Admin Group (ID 1)
  if (user.id === 1 || (user.email && user.email.toLowerCase() === "cheychon258@gmail.com")) {
    const hasAdminGroup = groups.some((g: any) => g.id === 1 || g.name === "Admin Group");
    if (!hasAdminGroup) {
      groups = [{ id: 1, name: "Admin Group", description: "Full system administration & configuration access (Super Admin)" }, ...groups];
    }
  }

  const primaryGroup = groups[0];
  const primaryGroupName = (user.id === 1 || user.email?.toLowerCase() === "cheychon258@gmail.com")
    ? "Admin Group"
    : (primaryGroup?.name || "Cashier Group");
  const primaryGroupId = (user.id === 1 || user.email?.toLowerCase() === "cheychon258@gmail.com")
    ? 1
    : (primaryGroup?.id || 2);

  const roleObj = {
    id: primaryGroupId,
    name: primaryGroupName,
    description: primaryGroup?.description || `${primaryGroupName}`,
    permissions: groups.flatMap((g: any) =>
      g.groupPermissions?.map((gp: any) => gp.permission?.code).filter(Boolean) || []
    ),
  };

  return {
    ...user,
    role: roleObj,
    roleName: primaryGroupName,
    hasPin: Boolean(user.pin && String(user.pin).trim().length > 0),
    groups,
  };
}

export const listUsers = async () => {
  // 🛡️ Ensure User ID 1 is explicitly linked to Group ID 1 in database
  const user1Link = await prisma.userGroup.findFirst({
    where: { userId: 1, groupId: 1 },
  }).catch(() => null);

  if (!user1Link) {
    await prisma.userGroup.create({
      data: { userId: 1, groupId: 1 },
    }).catch(() => null);
  }

  // Clean up database: Remove non-ID 1 users from Group ID 1 and reassign to real Admin Update group in DB
  const invalidRootAssignments = await prisma.userGroup.findMany({
    where: {
      userId: { not: 1 },
      groupId: 1,
    },
  }).catch(() => []);

  if (invalidRootAssignments.length > 0) {
    const adminUpdateGroup = await findOrCreateGroup("Admin Update", false);
    for (const ug of invalidRootAssignments) {
      await prisma.userGroup.deleteMany({
        where: { userId: ug.userId, groupId: 1 },
      }).catch(() => null);
      await prisma.userGroup.create({
        data: { userId: ug.userId, groupId: adminUpdateGroup.id },
      }).catch(() => null);
    }
  }

  const [users, latestLogs] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
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
        isActive: true,
        pin: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: {
        action: { in: ["LOGIN", "LOGIN_PIN"] },
        status: "SUCCESS",
      },
      orderBy: { createdAt: "desc" },
      select: {
        userId: true,
        createdAt: true,
      },
    }),
  ]);

  const lastLoginMap = new Map<number, Date>();
  for (const log of latestLogs) {
    if (log.userId && !lastLoginMap.has(log.userId)) {
      lastLoginMap.set(log.userId, log.createdAt);
    }
  }

  return users.map((u) => {
    const formatted = formatUserRoleCompatibility(u);
    const lastLoginAt = lastLoginMap.get(u.id) || u.updatedAt || u.createdAt;
    return {
      ...formatted,
      lastLoginAt: lastLoginAt.toISOString(),
    };
  });
};

export const createUser = async (data: {
  email: string;
  password: string;
  name: string;
  role?: string;
  roleName?: string;
  groupIds?: number[];
  groupNames?: string[];
  isActive?: boolean;
  pin?: string;
  imageUrl?: string;
  permissions?: any[];
}) => {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });

  if (existing) {
    throw new Error("Email is already registered");
  }

  const hashedPassword = await hashPassword(data.password);

  const targetGroupIds: number[] = [];

  if (data.groupIds && data.groupIds.length > 0) {
    targetGroupIds.push(...data.groupIds.filter((gId) => gId !== 1));
  } else {
    const rawSelected = data.roleName ?? data.role ?? (data.groupNames ? data.groupNames[0] : "Cashier Group");
    const groupRecord = await findOrCreateGroup(rawSelected, false);
    targetGroupIds.push(groupRecord.id);
  }

  const newUser = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      isActive: data.isActive ?? true,
      pin: data.pin || null,
      imageUrl: data.imageUrl || null,
      userGroups: {
        create: targetGroupIds.map((groupId) => ({ groupId })),
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
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
      isActive: true,
      pin: true,
      imageUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return formatUserRoleCompatibility(newUser);
};

export const updateUser = async (
  id: number,
  data: {
    email?: string;
    password?: string;
    name?: string;
    role?: string;
    roleName?: string;
    groupIds?: number[];
    groupNames?: string[];
    isActive?: boolean;
    pin?: string;
    imageUrl?: string;
    permissions?: any[];
  },
) => {
  const existing = await prisma.user.findUnique({ where: { id } });

  if (!existing) {
    throw new Error("User not found");
  }

  const updateData: Record<string, unknown> = {};

  if (data.email !== undefined && data.email.trim() !== "") updateData.email = data.email.trim();
  if (data.name !== undefined && data.name.trim() !== "") updateData.name = data.name.trim();
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.pin !== undefined && data.pin.trim() !== "") updateData.pin = data.pin.trim();
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.password !== undefined && data.password.trim() !== "") {
    updateData.password = await hashPassword(data.password.trim());
  }

  let targetGroupIds: number[] | null = null;

  // 🛡️ Super Admin Protection Guard: User ID 1 or owner email ALWAYS stays Admin & Active
  if (id === 1 || existing.email?.toLowerCase() === "cheychon258@gmail.com") {
    const superGroup = await findOrCreateGroup("Admin Group", true);
    targetGroupIds = [superGroup.id];
    updateData.isActive = true;
  } else if (data.groupIds !== undefined && data.groupIds.length > 0) {
    targetGroupIds = data.groupIds.filter((gId) => gId !== 1);
    if (targetGroupIds.length === 0) {
      const fallbackGroup = await findOrCreateGroup("Admin Update Group", false);
      targetGroupIds = [fallbackGroup.id];
    }
  } else {
    const selectedGroup = data.roleName !== undefined ? data.roleName : data.role;
    if (selectedGroup !== undefined) {
      const groupRecord = await findOrCreateGroup(selectedGroup, false);
      targetGroupIds = [groupRecord.id];
    }
  }

  if (targetGroupIds !== null) {
    await prisma.userGroup.deleteMany({
      where: { userId: id },
    });

    if (targetGroupIds.length > 0) {
      await prisma.userGroup.createMany({
        data: targetGroupIds.map((groupId) => ({
          userId: id,
          groupId,
        })),
      });
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
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
      isActive: true,
      pin: true,
      imageUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return formatUserRoleCompatibility(updated);
};

export const deleteUser = async (id: number) => {
  if (id === 1) {
    throw new Error("System Protection: Super Admin account (ID 1) is a protected system owner and cannot be deleted.");
  }

  const existing = await prisma.user.findUnique({ where: { id } });

  if (!existing) {
    throw new Error("User not found");
  }

  if (existing.email?.toLowerCase() === "cheychon258@gmail.com") {
    throw new Error("System Protection: Super Admin account is a protected system owner and cannot be deleted.");
  }

  return prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};

// Aliases for Role management -> Group management
export const listRoles = listGroups;
export const createRole = createGroup;
export const updateRole = updateGroup;
export const deleteRole = deleteGroup;
