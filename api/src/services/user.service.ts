import { prisma } from "../config/prisma.js";
import { hashPassword } from "../utils/bcrypt.js";

export const listUsers = async () => {
  return prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      pin: true,
      imageUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

async function findOrCreateRole(targetRoleName?: string) {
  const selectedRole = (targetRoleName || "Cashier").trim();
  let roleRecord = await prisma.role.findUnique({
    where: { name: selectedRole },
  });

  if (!roleRecord) {
    roleRecord = await prisma.role.findFirst({
      where: { name: { equals: selectedRole, mode: "insensitive" } },
    });
  }

  if (!roleRecord) {
    try {
      roleRecord = await prisma.role.create({
        data: {
          name: selectedRole,
          description: `${selectedRole} Role`,
          permissions: [],
        },
      });
    } catch {
      roleRecord = await prisma.role.findFirst({
        where: { name: { equals: selectedRole, mode: "insensitive" } },
      });
    }
  }

  if (!roleRecord) {
    roleRecord = await prisma.role.findFirst({
      where: { name: { equals: "Staff", mode: "insensitive" } },
    });
  }

  if (!roleRecord) {
    roleRecord = await prisma.role.findFirst();
  }

  if (!roleRecord) {
    throw new Error("Invalid role: No roles found in system");
  }

  return roleRecord;
}

export const createUser = async (data: {
  email: string;
  password: string;
  name: string;
  role?: string;
  roleName?: string;
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

  const selectedRole = data.roleName ?? data.role ?? "Cashier";
  const roleRecord = await findOrCreateRole(selectedRole);

  let parsedPerms: any = data.permissions;
  if (typeof parsedPerms === "string") {
    try {
      parsedPerms = JSON.parse(parsedPerms);
    } catch {}
  }

  if (parsedPerms && Array.isArray(parsedPerms)) {
    await prisma.role.update({
      where: { id: roleRecord.id },
      data: { permissions: parsedPerms },
    });
  }

  return prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      roleId: roleRecord.id,
      isActive: data.isActive ?? true,
      pin: data.pin || null,
      imageUrl: data.imageUrl || null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      pin: true,
      imageUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const updateUser = async (
  id: number,
  data: {
    email?: string;
    password?: string;
    name?: string;
    role?: string;
    roleName?: string;
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

  if (data.email !== undefined) updateData.email = data.email;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.pin !== undefined) updateData.pin = data.pin;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.password) updateData.password = await hashPassword(data.password);

  let targetRoleId = existing.roleId;

  // 🛡️ Super Admin Protection Guard: User ID 1 or owner email ALWAYS stays Super Admin & Active
  if (id === 1 || existing.email?.toLowerCase() === "cheychon258@gmail.com") {
    const superRole = await findOrCreateRole("Super Admin");
    updateData.roleId = superRole.id;
    updateData.isActive = true;
    targetRoleId = superRole.id;
  } else {
    const selectedRole = data.roleName !== undefined ? data.roleName : data.role;
    if (selectedRole !== undefined) {
      const roleRecord = await findOrCreateRole(selectedRole);
      updateData.roleId = roleRecord.id;
      targetRoleId = roleRecord.id;
    }
  }

  let parsedPerms: any = data.permissions;
  if (typeof parsedPerms === "string") {
    try {
      parsedPerms = JSON.parse(parsedPerms);
    } catch {}
  }

  if (parsedPerms && Array.isArray(parsedPerms)) {
    await prisma.role.update({
      where: { id: targetRoleId },
      data: { permissions: parsedPerms },
    });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      pin: true,
      imageUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (parsedPerms && Array.isArray(parsedPerms) && updated.role) {
    (updated.role as any).permissions = parsedPerms;
  }

  return updated;
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

export const listRoles = async () => {
  return prisma.role.findMany({
    orderBy: { name: "asc" },
  });
};

export const createRole = async (data: {
  name: string;
  description: string;
  permissions: any;
}) => {
  const existing = await prisma.role.findUnique({
    where: { name: data.name },
  });
  if (existing) {
    throw new Error("Role name is already registered");
  }
  return prisma.role.create({
    data: {
      name: data.name,
      description: data.description,
      permissions: data.permissions,
    },
  });
};

export const updateRole = async (
  id: number,
  data: {
    name?: string;
    description?: string;
    permissions?: any;
  },
) => {
  const existing = await prisma.role.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Role not found");
  }

  if (data.name && data.name !== existing.name) {
    const duplicate = await prisma.role.findUnique({
      where: { name: data.name },
    });
    if (duplicate) {
      throw new Error("Role name is already registered");
    }
  }

  return prisma.role.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      permissions: data.permissions,
    },
  });
};

export const deleteRole = async (id: number) => {
  const existing = await prisma.role.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Role not found");
  }

  const assignedUsersCount = await prisma.user.count({
    where: { roleId: id, deletedAt: null },
  });
  if (assignedUsersCount > 0) {
    throw new Error("Cannot delete role: active staff members are currently assigned to it");
  }

  return prisma.role.delete({
    where: { id },
  });
};
