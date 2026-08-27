import { prisma } from "../config/prisma.js";

/**
 * Checks if a given user belongs to any Group that contains the requested permissionCode.
 */
export async function hasPermission(
  userId: number,
  permissionCode: string,
): Promise<boolean> {
  if (!userId || !permissionCode) {
    return false;
  }

  const match = await prisma.userGroup.findFirst({
    where: {
      userId,
      group: {
        groupPermissions: {
          some: {
            permission: {
              code: permissionCode,
            },
          },
        },
      },
    },
  });

  return Boolean(match);
}

/**
 * Retrieves all unique permission codes assigned to a user via their assigned groups.
 */
export async function getUserPermissions(userId: number): Promise<string[]> {
  if (!userId) {
    return [];
  }

  const userGroups = await prisma.userGroup.findMany({
    where: { userId },
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
  });

  const permissionsSet = new Set<string>();

  for (const ug of userGroups) {
    for (const gp of ug.group.groupPermissions) {
      if (gp.permission && gp.permission.code) {
        permissionsSet.add(gp.permission.code);
      }
    }
  }

  return Array.from(permissionsSet);
}

/**
 * Retrieves all groups associated with a given user.
 */
export async function getUserGroups(userId: number) {
  if (!userId) {
    return [];
  }

  const userGroups = await prisma.userGroup.findMany({
    where: { userId },
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
  });

  return userGroups.map((ug) => ug.group);
}
