import { prisma } from "../config/prisma.js";
import { OrderStatus } from "../prisma/client.js";

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
  const s = String(status ?? "pending").toLowerCase();
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
    customer: true,
    createdBy: true,
    items: {
      include: {
        product: true,
        variant: true,
        modifiers: { include: { modifier: true } },
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

  const count = await prisma.order.count({
    where: {
      createdAt: {
        gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      },
    },
  });

  return `ORD-${stamp}-${String(count + 1).padStart(4, "0")}`;
}

export const listOrders = async (query: Record<string, string> = {}) => {
  const where: Record<string, unknown> = { deletedAt: null };
  if (query.status) where.status = normalizeStatus(query.status);

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
    customerId?: number;
    status?: string;
    notes?: string;
    discountAmount?: number;
    taxAmount?: number;
    items?: {
      productId: number;
      variantId?: number;
      quantity?: number;
      notes?: string;
    }[];
  },
  userId?: number,
) => {
  const subtotal = toNum(0);
  const discountAmount = toNum(payload.discountAmount);
  const taxAmount = toNum(payload.taxAmount);
  const totalAmount = Math.max(subtotal - discountAmount + taxAmount, 0);

  const created = await prisma.order.create({
    data: {
      orderNumber: await generateOrderNumber(),
      tableId: payload.tableId,
      customerId: payload.customerId,
      createdById: userId,
      status: normalizeStatus(payload.status) as OrderStatus,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      notes: payload.notes,
    },
    include: buildOrderInclude(),
  });

  return formatOrder(created);
};

export const updateOrderStatus = async (id: number, status: string) => {
  const order = await prisma.order.update({
    where: { id },
    data: { status: normalizeStatus(status) as OrderStatus },
    include: buildOrderInclude(),
  });

  return formatOrder(order);
};

export const deleteOrder = async (id: number) => {
  return prisma.order.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};

export const addOrderItem = async (
  orderId: number,
  payload: {
    productId: number;
    variantId?: number;
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
  const unitPrice = toNum(product.basePrice);
  const totalPrice = unitPrice * quantity;

  await prisma.orderItem.create({
    data: {
      orderId: order.id,
      productId: product.id,
      variantId: payload.variantId,
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
