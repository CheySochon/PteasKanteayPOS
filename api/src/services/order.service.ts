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
  const rawItems = Array.isArray(order.items) ? (order.items as any[]) : [];
  const items = rawItems.map((item) => {
    const u = toNum(item.unitPrice ?? item.price ?? item.product?.basePrice);
    const qty = Math.max(1, toNum(item.quantity || 1));
    const t = toNum(item.totalPrice) > 0 ? toNum(item.totalPrice) : u * qty;
    return {
      ...item,
      name: item.product?.name || item.name || (item.productId ? `Item #${item.productId}` : "Item"),
      unitPrice: u,
      totalPrice: t,
    };
  });

  const computedSubtotal = items.length > 0
    ? items.reduce((sum, item) => sum + toNum(item.totalPrice), 0)
    : toNum(order.subtotal);

  const subtotal = toNum(order.subtotal) > 0 ? toNum(order.subtotal) : computedSubtotal;
  const discountAmount = toNum(order.discountAmount);
  const taxAmount = toNum(order.taxAmount);
  const rawTotal = toNum(order.totalAmount);
  const totalAmount = rawTotal > 0 ? rawTotal : Math.max(subtotal - discountAmount + taxAmount, 0);

  return {
    ...order,
    items: rawItems.length > 0 ? items : order.items,
    orderId: order.orderNumber,
    tableNo: table?.name ?? null,
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount,
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
  };
}

async function generateOrderNumber(tx?: any): Promise<string> {
  const client = tx || prisma;
  const date = new Date();
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");

  const rand = Math.floor(1000 + Math.random() * 9000);
  const count = await client.order.count();

  return `ORD-${stamp}-${String(count + 1).padStart(4, "0")}-${rand}`;
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

  const limitParam = Number(query.limit);
  const take = !isNaN(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 100;

  const orders = await prisma.order.findMany({
    where,
    include: buildOrderInclude(),
    orderBy: { createdAt: "desc" },
    take,
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

const MAX_INT = 2147483647;

async function findProductSafely(productId: any, name?: string, price?: number) {
  const pid = Number(productId);
  let product = null;

  if (pid && !isNaN(pid) && pid > 0 && pid <= MAX_INT) {
    product = await prisma.product.findUnique({
      where: { id: pid },
    });
  }

  const cleanName = name && typeof name === "string" ? name.trim() : "";

  // Safety Verification: If product was found by ID, but cleanName is provided and DOES NOT MATCH the product's name,
  // then pid was a wrong/mismatched ID (e.g. 1 or custom timestamp ID).
  // We invalidate product to null so it looks up or creates by cleanName!
  if (product && cleanName) {
    const pName = product.name.trim().toLowerCase();
    const cName = cleanName.toLowerCase();
    const matches = pName === cName || pName.includes(cName) || cName.includes(pName);
    if (!matches) {
      product = null;
    }
  }

  // 1. Exact string match first (vital for non-ASCII/Khmer names)
  if (!product && cleanName) {
    product = await prisma.product.findFirst({
      where: { name: cleanName, deletedAt: null },
    });
  }

  if (!product && cleanName) {
    product = await prisma.product.findFirst({
      where: { name: { equals: cleanName, mode: "insensitive" }, deletedAt: null },
    });
  }

  if (!product && cleanName) {
    product = await prisma.product.findFirst({
      where: { name: { contains: cleanName, mode: "insensitive" }, deletedAt: null },
    });
  }

  // Dynamic Auto-Creation: If a real product name was sent but no match exists yet, create it in DB
  if (!product && cleanName) {
    try {
      let defaultCategory = await prisma.category.findFirst({ where: { deletedAt: null }, orderBy: { id: "asc" } });
      if (!defaultCategory) {
        defaultCategory = await prisma.category.create({
          data: { name: "General", slug: `general-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}` },
        });
      }
      const safeNameSlug = cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const baseSlug = safeNameSlug || "item";
      const uniqueSlug = `${baseSlug}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      product = await prisma.product.create({
        data: {
          name: cleanName,
          slug: uniqueSlug,
          basePrice: price && !isNaN(price) ? price : 0,
          categoryId: defaultCategory.id,
          isAvailable: true,
          trackStock: false,
        },
      });
    } catch (err) {
      console.error("Auto-creating product failed:", err);
    }
  }

  // Fallback only if no product AND no cleanName was supplied
  if (!product && !cleanName) {
    product = await prisma.product.findFirst({
      where: { deletedAt: null },
      orderBy: { id: "asc" },
    });
  }

  return product;
}

export const createOrder = async (payload: {
  tableId?: number | null;
  tableNo?: string;
  status?: string;
  subtotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  notes?: string;
  items?: {
    productId: number;
    name?: string;
    quantity: number;
    unitPrice?: number;
    price?: number;
    totalPrice?: number;
    notes?: string;
  }[];
}, userId?: number) => {
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  if (rawItems.length === 0) {
    throw new Error("Order items required");
  }

  return prisma.$transaction(async (tx) => {
    // Check stock availability first inside transaction
    for (const item of rawItems) {
      const itemName = (item as any).name || (item as any).productName || (item as any).title;
      const itemPrice = toNum(item.unitPrice ?? item.price ?? 0);
      const product = await findProductSafely(item.productId, itemName, itemPrice);
      if (product?.trackStock) {
        const inventory = await tx.inventory.findUnique({
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
      const itemName = (item as any).name || (item as any).productName || (item as any).title;
      const itemPrice = toNum(item.unitPrice ?? item.price ?? 0);
      const product = await findProductSafely(item.productId, itemName, itemPrice);
      if (!product) {
        throw new Error(`Unable to resolve or create product for item: "${itemName || item.productId}"`);
      }
      const targetProductId = product.id;

      const qty = Math.max(1, Number(item.quantity || 1));
      const finalPrice = itemPrice > 0 ? itemPrice : toNum(product?.basePrice ?? 0);
      const totalPrice = toNum(item.totalPrice ?? (finalPrice * qty));

      calculatedSubtotal += totalPrice;

      itemsToCreate.push({
        productId: targetProductId,
        quantity: qty,
        unitPrice: finalPrice,
        totalPrice: totalPrice,
        notes: item.notes || null,
      });
    }

    const subtotal = payload.subtotal ? toNum(payload.subtotal) : calculatedSubtotal;
    const discountAmount = toNum(payload.discountAmount);
    const taxAmount = toNum(payload.taxAmount);
    const totalAmount = payload.totalAmount ? toNum(payload.totalAmount) : Math.max(subtotal - discountAmount + taxAmount, 0);

    const orderNum = await generateOrderNumber(tx);

    const created = await tx.order.create({
      data: {
        orderNumber: orderNum,
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

    // Deduct stock for items where trackStock is enabled inside transaction
    for (const item of created.items) {
      if (item.product?.trackStock) {
        const inv = await tx.inventory.findUnique({ where: { productId: item.productId } });
        if (inv) {
          await tx.inventory.update({
            where: { productId: item.productId },
            data: { quantity: Number(inv.quantity) - item.quantity },
          });
          await tx.stockTransaction.create({
            data: {
              productId: item.productId,
              type: "sale",
              quantity: -item.quantity,
              referenceId: created.orderNumber,
              userId: userId || null,
            },
          });
        }
      }
    }

    return formatOrder(created);
  });
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
      const product = await findProductSafely(item.productId);
      if (product?.trackStock) {
        await adjustStock(
          product.id,
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
      const product = await findProductSafely(item.productId);
      if (product?.trackStock) {
        const inventory = await prisma.inventory.findUnique({ where: { productId: product.id } });
        const available = Number(inventory?.quantity ?? 0);
        if (available < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}. Available: ${available} ${product.unit}`);
        }
      }
    }
    // Deduct stock again
    for (const item of currentOrder.items) {
      const product = await findProductSafely(item.productId);
      if (product?.trackStock) {
        await adjustStock(
          product.id,
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

export const deleteOrder = async (id: number, userId?: number) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (order && order.status !== "cancelled") {
    for (const item of order.items) {
      const product = await findProductSafely(item.productId);
      if (product?.trackStock) {
        await adjustStock(
          product.id,
          item.quantity,
          "return",
          order.orderNumber,
          "Order deleted",
          userId
        );
      }
    }
  }

  return prisma.order.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};

export const updateOrder = async (
  id: number,
  payload: {
    tableId?: number | null;
    status?: string;
    notes?: string;
    subtotal?: number;
    discountAmount?: number;
    taxAmount?: number;
    totalAmount?: number;
    items?: {
      productId: number;
      name?: string;
      quantity?: number;
      unitPrice?: number;
      price?: number;
      totalPrice?: number;
      notes?: string;
    }[];
  },
  userId?: number,
) => {
  const current = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!current || current.deletedAt) throw new Error("Order not found");

  const rawItems = payload.items || [];

  // Check stock availability for new/increased items if trackStock is enabled
  for (const item of rawItems) {
    const product = await findProductSafely(item.productId, (item as any).name || (item as any).productName);
    if (product?.trackStock) {
      const inventory = await prisma.inventory.findUnique({
        where: { productId: product.id },
      });
      const existingItem = current.items.find((i) => i.productId === product.id);
      const prevQty = existingItem ? existingItem.quantity : 0;
      const newQty = Math.max(1, Number(item.quantity || 1));
      const diff = newQty - prevQty;

      if (diff > 0) {
        const available = Number(inventory?.quantity ?? 0);
        if (available < diff) {
          throw new Error(`Insufficient stock for product ${product.name}. Available: ${available} ${product.unit}`);
        }
      }
    }
  }

  // Adjust stock differences for removed / changed items
  for (const oldItem of current.items) {
    const newItem = rawItems.find((i) => Number(i.productId) === oldItem.productId);
    const product = await findProductSafely(oldItem.productId);
    if (product?.trackStock) {
      if (!newItem) {
        await adjustStock(
          product.id,
          oldItem.quantity,
          "return",
          current.orderNumber,
          "Item removed from order",
          userId
        );
      } else {
        const diff = Number(newItem.quantity || 1) - oldItem.quantity;
        if (diff !== 0) {
          await adjustStock(
            product.id,
            -diff,
            diff > 0 ? "sale" : "return",
            current.orderNumber,
            "Order item quantity updated",
            userId
          );
        }
      }
    }
  }

  // Stock for newly added items
  for (const newItem of rawItems) {
    const product = await findProductSafely(newItem.productId, (newItem as any).name || (newItem as any).productName);
    const existing = product ? current.items.find((i) => i.productId === product.id) : null;
    if (!existing && product?.trackStock) {
      const qty = Math.max(1, Number(newItem.quantity || 1));
      await adjustStock(
        product.id,
        -qty,
        "sale",
        current.orderNumber,
        "New item added to order",
        userId
      );
    }
  }

  // Delete old order items & recreate updated ones
  await prisma.orderItem.deleteMany({ where: { orderId: id } });

  let calculatedSubtotal = 0;
  const itemsToCreate = [];

  for (const item of rawItems) {
    const itemName = (item as any).name || (item as any).productName || (item as any).title;
    const itemPrice = toNum(item.unitPrice ?? item.price ?? 0);
    const product = await findProductSafely(item.productId, itemName, itemPrice);

    const qty = Math.max(1, Number(item.quantity || 1));
    const finalPrice = itemPrice > 0 ? itemPrice : toNum(product?.basePrice ?? 0);
    const totalPrice = toNum(item.totalPrice ?? (finalPrice * qty));

    calculatedSubtotal += totalPrice;

    if (!product) {
      throw new Error(`Unable to resolve or create product for item: "${itemName || item.productId}"`);
    }

    itemsToCreate.push({
      productId: product.id,
      quantity: qty,
      unitPrice: finalPrice,
      totalPrice: totalPrice,
      notes: item.notes || null,
    });
  }

  const subtotal = payload.subtotal ? toNum(payload.subtotal) : calculatedSubtotal;
  const discountAmount = toNum(payload.discountAmount);
  const taxAmount = toNum(payload.taxAmount);
  const totalAmount = payload.totalAmount ? toNum(payload.totalAmount) : Math.max(subtotal - discountAmount + taxAmount, 0);

  const updated = await prisma.order.update({
    where: { id },
    data: {
      tableId: payload.tableId !== undefined ? (payload.tableId ? Number(payload.tableId) : null) : current.tableId,
      status: payload.status ? (normalizeStatus(payload.status) as OrderStatus) : current.status,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      notes: payload.notes !== undefined ? payload.notes : current.notes,
      items: {
        create: itemsToCreate,
      },
    },
    include: buildOrderInclude(),
  });

  return formatOrder(updated);
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

  const product = await findProductSafely(payload.productId, (payload as any).name || (payload as any).productName);

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
