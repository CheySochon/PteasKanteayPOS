import { prisma } from "../config/prisma.js";
import { TableZone } from "@prisma/client";

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
  reservation?: string | null;
}) => {
  return prisma.diningTable.create({
    data: {
      name: data.name,
      capacity: data.capacity ?? 2,
      zone: (data.zone ?? "indoor") as TableZone,
      qrToken: data.qrToken ?? makeTableToken(data.name),
      isActive: data.isActive ?? true,
      ...(data.reservation !== undefined ? { reservation: data.reservation } : {}),
    } as any,
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
    reservation?: string | null;
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
      ...(data.reservation !== undefined ? { reservation: data.reservation } : {}),
    } as any,
  });
};

export const deleteTable = async (id: number) => {
  return prisma.diningTable.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};

export const getTableByQrToken = async (qrToken: string) => {
  const cleanToken = decodeURIComponent(qrToken || "").trim();

  const table = await prisma.diningTable.findFirst({
    where: {
      deletedAt: null,
      isActive: true,
      OR: [
        { qrToken: cleanToken },
        { name: { equals: cleanToken, mode: "insensitive" } },
        { name: { equals: cleanToken.replace(/^table-?/i, ""), mode: "insensitive" } },
      ],
    },
  });

  if (!table) {
    const fallbackTable = await prisma.diningTable.findFirst({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
    });

    if (fallbackTable) return fallbackTable;
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
      where: { deletedAt: null },
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

export const moveTable = async (sourceTableId: number, targetTableId: number) => {
  if (sourceTableId === targetTableId) {
    throw new Error("Source and target tables must be different");
  }

  const [sourceTable, targetTable] = await Promise.all([
    prisma.diningTable.findFirst({ where: { id: sourceTableId, deletedAt: null } }),
    prisma.diningTable.findFirst({ where: { id: targetTableId, deletedAt: null } }),
  ]);

  if (!sourceTable) throw new Error("Source table not found");
  if (!targetTable) throw new Error("Target table not found");
  if (!targetTable.isActive) throw new Error("Target table is inactive");

  const activeStatuses = ["pending", "accepted", "preparing", "ready", "served"];

  const sourceOrders = await prisma.order.findMany({
    where: {
      tableId: sourceTableId,
      deletedAt: null,
      status: { in: activeStatuses as any },
    },
  });

  if (sourceOrders.length === 0) {
    throw new Error(`Table ${sourceTable.name} has no active order to move`);
  }

  const targetOrders = await prisma.order.findMany({
    where: {
      tableId: targetTableId,
      deletedAt: null,
      status: { in: activeStatuses as any },
    },
  });

  if (targetOrders.length > 0) {
    throw new Error(`Target table ${targetTable.name} already has an active order. Use Merge Table to combine orders.`);
  }

  await prisma.order.updateMany({
    where: {
      tableId: sourceTableId,
      deletedAt: null,
      status: { in: activeStatuses as any },
    },
    data: {
      tableId: targetTableId,
    },
  });

  return {
    success: true,
    message: `Moved table ${sourceTable.name} to ${targetTable.name}`,
    sourceTable,
    targetTable,
  };
};

async function getOrCreateActiveOrder(tableId: number, tableName: string) {
  const activeStatuses = ["pending", "accepted", "preparing", "ready", "served"];
  let order = await prisma.order.findFirst({
    where: {
      tableId,
      deletedAt: null,
      status: { in: activeStatuses as any },
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  if (!order) {
    const stamp = Date.now().toString().slice(-6);
    const rand = Math.floor(100 + Math.random() * 900);
    const orderNumber = `ORD-${stamp}-${rand}`;
    order = (await prisma.order.create({
      data: {
        orderNumber,
        tableId,
        status: "pending",
        subtotal: 0,
        totalAmount: 0,
        notes: null,
      },
      include: { items: true },
    })) as any;
  }
  return order!;
}

export const mergeTable = async (sourceTableId: number, targetTableId: number) => {
  if (sourceTableId === targetTableId) {
    throw new Error("Source and target tables must be different");
  }

  return prisma.$transaction(async (tx) => {
    const [sourceTable, targetTable] = await Promise.all([
      tx.diningTable.findFirst({ where: { id: sourceTableId, deletedAt: null } }),
      tx.diningTable.findFirst({ where: { id: targetTableId, deletedAt: null } }),
    ]);

    if (!sourceTable) throw new Error("Source table not found");
    if (!targetTable) throw new Error("Target table not found");

    const [sourceOrder, targetOrder] = await Promise.all([
      getOrCreateActiveOrder(sourceTableId, sourceTable.name),
      getOrCreateActiveOrder(targetTableId, targetTable.name),
    ]);

    if (sourceOrder.items && sourceOrder.items.length > 0) {
      await tx.orderItem.updateMany({
        where: { orderId: sourceOrder.id },
        data: { orderId: targetOrder.id },
      });
    }

    const allTargetItems = await tx.orderItem.findMany({
      where: { orderId: targetOrder.id },
    });

    let newSubtotal = 0;
    for (const item of allTargetItems) {
      newSubtotal += Number(item.totalPrice);
    }

    const newTotalAmount = Math.max(
      newSubtotal - Number(targetOrder.discountAmount || 0) + Number(targetOrder.taxAmount || 0),
      0
    );

    const mergeNote = targetOrder.notes && !targetOrder.notes.includes(`Merged with ${sourceTable.name}`)
      ? `${targetOrder.notes} (Merged with ${sourceTable.name})`
      : `Merged with ${sourceTable.name}`;

    const updatedTargetOrder = await tx.order.update({
      where: { id: targetOrder.id },
      data: {
        subtotal: newSubtotal,
        totalAmount: newTotalAmount,
        notes: mergeNote,
      },
      include: {
        table: true,
        items: { include: { product: true } },
      },
    });

    await tx.order.update({
      where: { id: sourceOrder.id },
      data: {
        status: targetOrder.status,
        subtotal: 0,
        totalAmount: 0,
        notes: `Merged into ${targetTable.name}`,
      },
    });

    return {
      success: true,
      message: `Merged ${sourceTable.name} into ${targetTable.name}`,
      mergedOrder: updatedTargetOrder,
      sourceTable,
      targetTable,
    };
  });
};

export const unmergeTable = async (tableId: number) => {
  const table = await prisma.diningTable.findFirst({ where: { id: tableId, deletedAt: null } });
  if (!table) throw new Error("Table not found");

  const activeStatuses = ["pending", "accepted", "preparing", "ready", "served"];

  const activeOrders = await prisma.order.findMany({
    where: {
      deletedAt: null,
      status: { in: activeStatuses as any },
    },
  });

  for (const order of activeOrders) {
    if (order.tableId === tableId || (order.notes && order.notes.toLowerCase().includes(table.name.toLowerCase()))) {
      const cleanNote = (order.notes || "")
        .replace(/\s*\(Merged with [^)]+\)/gi, "")
        .replace(/Merged with [^\n,]+/gi, "")
        .replace(/Merged into [^\n,]+/gi, "")
        .trim();

      if (order.notes && order.notes.includes("Merged into")) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "completed", notes: null },
        });
      } else {
        await prisma.order.update({
          where: { id: order.id },
          data: { notes: cleanNote || null },
        });
      }
    }
  }

  return { success: true, message: `Table ${table.name} unmerged`, table };
};



