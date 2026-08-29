import { prisma } from "../config/prisma.js";
import { hashPassword } from "../utils/bcrypt.js";
import {
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
} from "./group.service.js";

async function findOrCreateGroup(targetGroupName?: string) {
  const selectedName = (targetGroupName || "Cashier").trim();

  let groupRecord = await prisma.group.findUnique({
    where: { name: selectedName },
  });

  if (!groupRecord) {
    groupRecord = await prisma.group.findFirst({
      where: { name: { equals: selectedName, mode: "insensitive" } },
    });
  }

  if (!groupRecord) {
    try {
      groupRecord = await prisma.group.create({
        data: {
          name: selectedName,
          description: `${selectedName} Group`,
        },
      });
    } catch {
      groupRecord = await prisma.group.findFirst({
        where: { name: { equals: selectedName, mode: "insensitive" } },
      });
    }
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
  const groups = user.userGroups?.map((ug: any) => ug.group) || [];
  const primaryGroupName = groups[0]?.name || "Staff";
  const primaryGroupId = groups[0]?.id || 1;

  const roleObj = {
    id: primaryGroupId,
    name: primaryGroupName,
    description: groups[0]?.description || `${primaryGroupName} Group`,
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
  const users = await prisma.user.findMany({
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
  });

  return users.map(formatUserRoleCompatibility);
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
    const norm = rawSelected.trim().toLowerCase();
    const safeSelectedGroup = (norm === "admin" || norm === "super admin" || norm === "super_admin") ? "Cashier Group" : rawSelected;
    const groupRecord = await findOrCreateGroup(safeSelectedGroup);
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
    const superGroup = await findOrCreateGroup("Admin");
    targetGroupIds = [superGroup.id];
    updateData.isActive = true;
  } else if (data.groupIds !== undefined && data.groupIds.length > 0) {
    targetGroupIds = data.groupIds.filter((gId) => gId !== 1);
  } else {
    const selectedGroup = data.roleName !== undefined ? data.roleName : data.role;
    if (selectedGroup !== undefined) {
      const norm = selectedGroup.trim().toLowerCase();
      const safeSelectedGroup = (norm === "admin" || norm === "super admin" || norm === "super_admin") ? "Cashier Group" : selectedGroup;
      const groupRecord = await findOrCreateGroup(safeSelectedGroup);
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
