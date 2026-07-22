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
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const createUser = async (data: {
  email: string;
  password: string;
  name: string;
  role?: string;
  roleName?: string;
  isActive?: boolean;
}) => {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });

  if (existing) {
    throw new Error("Email is already registered");
  }

  const hashedPassword = await hashPassword(data.password);

  const selectedRole = data.roleName ?? data.role ?? "Staff";
  const roleRecord = await prisma.role.findUnique({
    where: { name: selectedRole },
  });

  if (!roleRecord) {
    throw new Error("Invalid role");
  }

  return prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      roleId: roleRecord.id,
      isActive: data.isActive ?? true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
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
  if (data.password) updateData.password = await hashPassword(data.password);

  const selectedRole = data.roleName !== undefined ? data.roleName : data.role;
  if (selectedRole !== undefined) {
    const roleRecord = await prisma.role.findUnique({
      where: { name: selectedRole },
    });
    if (!roleRecord) {
      throw new Error("Invalid role");
    }
    updateData.roleId = roleRecord.id;
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const deleteUser = async (id: number) => {
  const existing = await prisma.user.findUnique({ where: { id } });

  if (!existing) {
    throw new Error("User not found");
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
