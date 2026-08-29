import { prisma } from "../config/prisma.js";

export const listSuppliers = async () => {
  return prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
};

export const createSupplier = async (data: {
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}) => {
  return prisma.supplier.create({
    data: {
      name: data.name,
      companyName: data.companyName || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      notes: data.notes || null,
    },
  });
};

export const updateSupplier = async (
  id: number,
  data: {
    name?: string;
    companyName?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
    isActive?: boolean;
  },
) => {
  return prisma.supplier.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.companyName !== undefined ? { companyName: data.companyName } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.address !== undefined ? { address: data.address } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
};

export const deleteSupplier = async (id: number) => {
  return prisma.supplier.update({
    where: { id },
    data: { isActive: false },
  });
};
