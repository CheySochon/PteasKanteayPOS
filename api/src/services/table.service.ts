import { prisma } from "../config/prisma.js";
import { TableZone } from "../prisma/client.js";

function makeTableToken(name: string): string {
  return `table-${String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
}

export const listTables = async () => {
  return prisma.diningTable.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
};

export const createTable = async (data: {
  name: string;
  capacity?: number;
  zone?: string;
  qrToken?: string;
  isActive?: boolean;
}) => {
  return prisma.diningTable.create({
    data: {
      name: data.name,
      capacity: data.capacity ?? 2,
      zone: (data.zone ?? "indoor") as TableZone,
      qrToken: data.qrToken ?? makeTableToken(data.name),
      isActive: data.isActive ?? true,
    },
  });
};

export const updateTable = async (
  id: number,
  data: {
    name?: string;
    capacity?: number;
    zone?: string;
    qrToken?: string;
    isActive?: boolean;
  },
) => {
  return prisma.diningTable.update({
    where: { id },
    data: {
      name: data.name,
      capacity: data.capacity,
      zone: data.zone as TableZone | undefined,
      qrToken: data.qrToken,
      isActive: data.isActive,
    },
  });
};

export const deleteTable = async (id: number) => {
  return prisma.diningTable.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};

export const getTableByQrToken = async (qrToken: string) => {
  const table = await prisma.diningTable.findFirst({
    where: { qrToken, deletedAt: null, isActive: true },
  });

  if (!table) {
    throw new Error("Table not found");
  }

  return table;
};

export const getQrMenu = async (qrToken: string) => {
  const table = await getTableByQrToken(qrToken);

  const [categories, products, setting] = await Promise.all([
    prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { deletedAt: null, isAvailable: true },
      include: {
        category: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.appSetting.findFirst({
      where: { key: "general" },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const settingValue = setting?.value as any;

  return {
    table,
    categories,
    products,
    restaurant: {
      name: settingValue?.restaurantName || "ផ្ទះកន្ត្រក ផ្លូវ១០",
      logoUrl: settingValue?.restaurantImageUrl || "",
    },
  };
};
