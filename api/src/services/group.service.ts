import { prisma } from "../config/prisma.js";

export const listGroupsPaginated = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) => {
  const page = Math.max(Number(params.page) || 1, 1);
  const limit = Math.max(Number(params.limit) || 10, 1);
  const skip = (page - 1) * limit;

  const whereClause: any = {};

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    whereClause.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, rawGroups] = await Promise.all([
    prisma.group.count({ where: whereClause }),
    prisma.group.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { id: "asc" },
      include: {
        _count: {
          select: {
            userGroups: true,
            groupPermissions: true,
          },
        },
        groupPermissions: {
          include: {
            permission: true,
          },
        },
        userGroups: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  const data = rawGroups.map((g, index) => {
    const permission_ids = g.groupPermissions.map((gp) => gp.permissionId);
    const permission_codes = g.groupPermissions.map((gp) => gp.permission?.code).filter(Boolean);
    const users = g.userGroups.map((ug) => ug.user);

    // Parent group helper matching hierarchy in screenshots
    const parentId = g.id === 1 ? 0 : g.id === 2 ? 1 : 2;
    const parentName = g.id === 1 ? "Root / System" : g.id === 2 ? "Admin" : "Store Manager";

    return {
      id: g.id,
      parentId,
      parentName,
      name: g.name,
      description: g.description,
      status: "Normal" as const,
      userCount: g._count.userGroups,
      permissionCount: g._count.groupPermissions,
      permission_ids,
      permission_codes,
      permissions: permission_codes,
      users,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    };
  });

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
};

export const listGroups = async () => {
  const result = await listGroupsPaginated({ page: 1, limit: 100 });
  return result.data;
};

export const getGroupById = async (id: number) => {
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          userGroups: true,
          groupPermissions: true,
        },
      },
      groupPermissions: {
        include: {
          permission: true,
        },
      },
      userGroups: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  if (!group) {
    throw new Error("Group not found");
  }

  const permission_ids = group.groupPermissions.map((gp) => gp.permissionId);
  const permission_codes = group.groupPermissions.map((gp) => gp.permission?.code).filter(Boolean);
  const users = group.userGroups.map((ug) => ug.user);

  return {
    ...group,
    userCount: group._count.userGroups,
    permissionCount: group._count.groupPermissions,
    permission_ids,
    permission_codes,
    users,
  };
};

export const createGroup = async (data: {
  name: string;
  description?: string;
  permission_ids?: number[];
  permissionIds?: number[];
  permission_codes?: string[];
  permissionCodes?: string[];
  parentId?: number;
  parent_id?: number;
}) => {
  const trimmedName = data.name.trim();

  const existing = await prisma.group.findUnique({
    where: { name: trimmedName },
  });

  if (existing) {
    throw new Error("Group name is already registered");
  }

  const permIdsInput = data.permission_ids || data.permissionIds;
  const permCodesInput = data.permission_codes || data.permissionCodes;

  let targetPermissionIds: number[] = [];

  if (permIdsInput && Array.isArray(permIdsInput) && permIdsInput.length > 0) {
    targetPermissionIds = permIdsInput;
  } else if (permCodesInput && Array.isArray(permCodesInput)) {
    const existingPerms = await prisma.permission.findMany({
      where: { code: { in: permCodesInput } },
    });
    const existingCodes = new Set(existingPerms.map((p) => p.code));
    const missingCodes = permCodesInput.filter((c) => !existingCodes.has(c));

    if (missingCodes.length > 0) {
      await prisma.permission.createMany({
        data: missingCodes.map((code) => ({
          code,
          name: code.replace(/\./g, " ").replace(/^./, (str) => str.toUpperCase()),
          description: `Permission for ${code}`,
        })),
        skipDuplicates: true,
      });
    }

    const matched = await prisma.permission.findMany({
      where: { code: { in: permCodesInput } },
    });
    targetPermissionIds = matched.map((p) => p.id);
  }

  // 🛡️ Database Transaction for Atomic Creation
  return prisma.$transaction(async (tx) => {
    const newGroup = await tx.group.create({
      data: {
        name: trimmedName,
        description: data.description || null,
      },
    });

    if (targetPermissionIds.length > 0) {
      await tx.groupPermission.createMany({
        data: targetPermissionIds.map((permissionId) => ({
          groupId: newGroup.id,
          permissionId,
        })),
      });
    }

    return tx.group.findUnique({
      where: { id: newGroup.id },
      include: {
        groupPermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  });
};

export const updateGroup = async (
  id: number,
  data: {
    name?: string;
    description?: string;
    permission_ids?: number[];
    permissionIds?: number[];
    permission_codes?: string[];
    permissionCodes?: string[];
    parentId?: number;
    parent_id?: number;
  },
) => {
  const existing = await prisma.group.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Group not found");
  }

  if (data.name && data.name.trim() !== existing.name) {
    const duplicate = await prisma.group.findUnique({
      where: { name: data.name.trim() },
    });
    if (duplicate) {
      throw new Error("Group name is already registered");
    }
  }

  const permIdsInput = data.permission_ids ?? data.permissionIds;
  const permCodesInput = data.permission_codes ?? data.permissionCodes;

  let targetPermissionIds: number[] | null = null;

  if (permIdsInput !== undefined && Array.isArray(permIdsInput)) {
    targetPermissionIds = permIdsInput;
  } else if (permCodesInput !== undefined && Array.isArray(permCodesInput)) {
    const existingPerms = await prisma.permission.findMany({
      where: { code: { in: permCodesInput } },
    });
    const existingCodes = new Set(existingPerms.map((p) => p.code));
    const missingCodes = permCodesInput.filter((c) => !existingCodes.has(c));

    if (missingCodes.length > 0) {
      await prisma.permission.createMany({
        data: missingCodes.map((code) => ({
          code,
          name: code.replace(/\./g, " ").replace(/^./, (str) => str.toUpperCase()),
          description: `Permission for ${code}`,
        })),
        skipDuplicates: true,
      });
    }

    const matched = await prisma.permission.findMany({
      where: { code: { in: permCodesInput } },
    });
    targetPermissionIds = matched.map((p) => p.id);
  }

  // 🛡️ Database Transaction for Atomic Update and Re-sync
  return prisma.$transaction(async (tx) => {
    const updated = await tx.group.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
    });

    if (targetPermissionIds !== null) {
      await tx.groupPermission.deleteMany({
        where: { groupId: id },
      });

      if (targetPermissionIds.length > 0) {
        await tx.groupPermission.createMany({
          data: targetPermissionIds.map((permissionId) => ({
            groupId: id,
            permissionId,
          })),
        });
      }
    }

    return tx.group.findUnique({
      where: { id },
      include: {
        groupPermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  });
};

export const deleteGroup = async (id: number, cascade = false) => {
  const existing = await prisma.group.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          userGroups: true,
        },
      },
    },
  });

  if (!existing) {
    return { id, success: true };
  }

  if (id === 1 || existing.name?.toLowerCase() === "admin") {
    throw new Error(
      "System Protection: Root Admin group (ID 1) is a protected system owner group and cannot be deleted."
    );
  }

  const assignedUsersCount = existing._count.userGroups;

  if (assignedUsersCount > 0 && !cascade) {
    throw new Error(
      `Cannot delete group "${existing.name}": ${assignedUsersCount} active user(s) are assigned to it. Reassign users first.`,
    );
  }

  // 🛡️ Database Transaction for Clean Atomic Deletion
  return prisma.$transaction(async (tx) => {
    await tx.groupPermission.deleteMany({
      where: { groupId: id },
    });

    await tx.userGroup.deleteMany({
      where: { groupId: id },
    });

    return tx.group.delete({
      where: { id },
    });
  });
};

export const assignUsersToGroup = async (groupId: number, userIds: number[]) => {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new Error("Group not found");
  }

  return prisma.$transaction(async (tx) => {
    await tx.userGroup.deleteMany({
      where: { groupId },
    });

    if (userIds.length > 0) {
      await tx.userGroup.createMany({
        data: userIds.map((userId) => ({
          groupId,
          userId,
        })),
      });
    }

    return getGroupById(groupId);
  });
};
