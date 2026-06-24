import { prisma } from "../config/prisma.js";

export const listCustomers = async () => {
  return prisma.customer.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
};

export const getCustomer = async (id: number) => {
  const customer = await prisma.customer.findFirst({
    where: { id, deletedAt: null },
  });

  if (!customer) throw new Error("Customer not found");

  return customer;
};

export const createCustomer = async (data: {
  name: string;
  phone?: string;
  email?: string;
  loyaltyPoints?: number;
}) => {
  return prisma.customer.create({
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email,
      loyaltyPoints: data.loyaltyPoints ?? 0,
    },
  });
};

export const updateCustomer = async (
  id: number,
  data: {
    name?: string;
    phone?: string;
    email?: string;
    loyaltyPoints?: number;
  },
) => {
  return prisma.customer.update({
    where: { id },
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email,
      loyaltyPoints: data.loyaltyPoints,
    },
  });
};

export const getCustomerOrders = async (id: number) => {
  return prisma.order.findMany({
    where: { customerId: id, deletedAt: null },
    include: { table: true, items: true, payments: true },
    orderBy: { createdAt: "desc" },
  });
};
