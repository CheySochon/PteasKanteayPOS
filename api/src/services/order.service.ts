import { prisma } from "../config/prisma.js";
import { OrderStatus } from "../prisma/client.js";
import { adjustStock } from "./inventory.service.js";

const ALLOWED_STATUSES = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "served",
  "completed",
  "cancelled",
];

function toNum(value: unknown): number {
  return Number(value ?? 0);
}

function normalizeStatus(status: unknown): string {
  const s = (typeof status === "string" ? status : "pending").toLowerCase();
  return ALLOWED_STATUSES.includes(s) ? s : "pending";
}

export function formatOrder(order: Record<string, unknown> | null) {
  if (!order) return order;
  const table = order.table as { name?: string } | null;
  return {
    ...order,
    orderId: order.orderNumber,
    tableNo: table?.name ?? null,
    subtotal: toNum(order.subtotal),
    discountAmount: toNum(order.discountAmount),
    taxAmount: toNum(order.taxAmount),
    totalAmount: toNum(order.totalAmount),
  };
}

function buildOrderInclude() {
  return {
    table: true,
    createdBy: true,
    items: {
      include: {
        product: true,
      },
    },
    payments: true,
  };
}

async function generateOrderNumber(): Promise<string> {
  const date = new Date();
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");

  const count = await prisma.order.count();

  return `ORD-${stamp}-${String(count + 1).padStart(4, "0")}`;
}

export const listOrders = async (query: Record<string, string> = {}) => {
  const where: any = { deletedAt: null };
  if (query.status) {
    if (query.status === "active") {
      where.status = { in: ["pending", "accepted", "preparing", "ready"] };
    } else {
      where.status = normalizeStatus(query.status);
    }
  }

  const orders = await prisma.order.findMany({
    where,
    include: buildOrderInclude(),
    orderBy: { createdAt: "desc" },
  });

  return orders.map((o) => formatOrder(o));
};

export const getOrder = async (id: number) => {
  const order = await prisma.order.findFirst({
    where: { id, deletedAt: null },
    include: buildOrderInclude(),
  });

  if (!order) throw new Error("Order not found");

  return formatOrder(order);
};

export const createOrder = async (
  payload: {
    tableId?: number;
    status?: string;
    notes?: string;
    subtotal?: number;
    discountAmount?: number;
    taxAmount?: number;
    totalAmount?: number;
    items?: {
      productId: number;
      quantity?: number;
      unitPrice?: number;
      price?: number;
      totalPrice?: number;
      notes?: string;
    }[];
  },
  userId?: number,
) => {
  const rawItems = payload.items || [];
  
  // Check stock availability first
  for (const item of rawItems) {
    const product = await prisma.product.findUnique({
      where: { id: Number(item.productId) },
    });
    if (product?.trackStock) {
      const inventory = await prisma.inventory.findUnique({
        where: { productId: product.id },
      });
      const qty = Math.max(1, Number(item.quantity || 1));
      const available = Number(inventory?.quantity ?? 0);
      if (available < qty) {
        throw new Error(`Insufficient stock for product ${product.name}. Available: ${available} ${product.unit}`);
      }
    }
  }
  
  let calculatedSubtotal = 0;
  const itemsToCreate = [];

  for (const item of rawItems) {
    const product = await prisma.product.findUnique({
      where: { id: Number(item.productId) },
    });

    const qty = Math.max(1, Number(item.quantity || 1));
    const unitPrice = toNum(item.unitPrice ?? item.price ?? product?.basePrice ?? 0);
    const totalPrice = toNum(item.totalPrice ?? (unitPrice * qty));

    calculatedSubtotal += totalPrice;

    itemsToCreate.push({
      productId: Number(item.productId),
      quantity: qty,
      unitPrice: unitPrice,
      totalPrice: totalPrice,
      notes: item.notes || null,
    });
  }

  const subtotal = payload.subtotal ? toNum(payload.subtotal) : calculatedSubtotal;
  const discountAmount = toNum(payload.discountAmount);
  const taxAmount = toNum(payload.taxAmount);
  const totalAmount = payload.totalAmount ? toNum(payload.totalAmount) : Math.max(subtotal - discountAmount + taxAmount, 0);

  const created = await prisma.order.create({
    data: {
      orderNumber: await generateOrderNumber(),
      tableId: payload.tableId ? Number(payload.tableId) : null,
      createdById: userId ? Number(userId) : null,
      status: normalizeStatus(payload.status) as OrderStatus,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      notes: payload.notes,
      items: {
        create: itemsToCreate,
      },
    },
    include: buildOrderInclude(),
  });

  // Deduct stock for items where trackStock is enabled
  for (const item of created.items) {
    if (item.product?.trackStock) {
      await adjustStock(
        item.productId,
        -item.quantity,
        "sale",
        created.orderNumber,
        null,
        userId
      );
    }
  }

  return formatOrder(created);
};

export const updateOrderStatus = async (id: number, status: string, userId?: number) => {
  const currentOrder = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!currentOrder) throw new Error("Order not found");

  const newStatus = normalizeStatus(status);

  // If transitioning to cancelled
  if (newStatus === "cancelled" && currentOrder.status !== "cancelled") {
    for (const item of currentOrder.items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (product?.trackStock) {
        await adjustStock(
          item.productId,
          item.quantity,
          "return",
          currentOrder.orderNumber,
          "Order cancelled",
          userId
        );
      }
    }
  }
  // If transitioning FROM cancelled back to something else (e.g. pending/accepted)
  else if (currentOrder.status === "cancelled" && newStatus !== "cancelled") {
    // Check stock availability first
    for (const item of currentOrder.items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (product?.trackStock) {
        const inventory = await prisma.inventory.findUnique({ where: { productId: item.productId } });
        const available = Number(inventory?.quantity ?? 0);
        if (available < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}. Available: ${available} ${product.unit}`);
        }
      }
    }
    // Deduct stock again
    for (const item of currentOrder.items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (product?.trackStock) {
        await adjustStock(
          item.productId,
          -item.quantity,
          "sale",
          currentOrder.orderNumber,
          "Order restored",
          userId
        );
      }
    }
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status: newStatus as OrderStatus },
    include: buildOrderInclude(),
  });

  return formatOrder(order);
};

export const deleteOrder = async (id: number) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (order && order.status !== "cancelled") {
    for (const item of order.items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (product?.trackStock) {
        await adjustStock(
          item.productId,
          item.quantity,
          "return",
          order.orderNumber,
          "Order deleted",
          null
        );
      }
    }
  }

  return prisma.order.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};

export const addOrderItem = async (
  orderId: number,
  payload: {
    productId: number;
    quantity?: number;
    notes?: string;
  },
) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) throw new Error("Order not found");

  const product = await prisma.product.findFirst({
    where: { id: payload.productId, deletedAt: null, isAvailable: true },
  });

  if (!product) throw new Error(`Product not found: ${payload.productId}`);

  const quantity = Number(payload.quantity ?? 1);

  if (product.trackStock) {
    const inventory = await prisma.inventory.findUnique({ where: { productId: product.id } });
    const available = Number(inventory?.quantity ?? 0);
    if (available < quantity) {
      throw new Error(`Insufficient stock for product ${product.name}. Available: ${available} ${product.unit}`);
    }
    
    // Deduct stock
    await adjustStock(
      product.id,
      -quantity,
      "sale",
      order.orderNumber,
      "Item added to order",
      null
    );
  }

  const unitPrice = toNum(product.basePrice);
  const totalPrice = unitPrice * quantity;

  await prisma.orderItem.create({
    data: {
      orderId: order.id,
      productId: product.id,
      quantity,
      unitPrice,
      totalPrice,
      notes: payload.notes,
    },
  });

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      subtotal: { increment: totalPrice },
      totalAmount: { increment: totalPrice },
    },
    include: buildOrderInclude(),
  });

  return formatOrder(updated);
};

export const splitBill = async (
  id: number,
  splits: { label?: string; amount: number }[],
) => {
  const order = await getOrder(id);
  const totalSplit = splits.reduce((sum, s) => sum + toNum(s.amount), 0);

  if (Math.abs(totalSplit - toNum((order as Record<string, unknown>).totalAmount)) > 0.01) {
    throw new Error("Split total must equal order total");
  }

  return { orderId: (order as Record<string, unknown>).id, totalAmount: (order as Record<string, unknown>).totalAmount, splits };
};

export const getActiveOrdersByQrToken = async (qrToken: string) => {
  const table = await prisma.diningTable.findUnique({
    where: { qrToken, isActive: true, deletedAt: null },
  });
  if (!table) throw new Error("Table not found or inactive");

  const orders = await prisma.order.findMany({
    where: {
      tableId: table.id,
      deletedAt: null,
      status: {
        in: ["pending", "accepted", "preparing", "ready", "served"],
      },
    },
    include: {
      items: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return orders;
};
