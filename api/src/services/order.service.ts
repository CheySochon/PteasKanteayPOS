import { prisma } from "../config/prisma.js";
import { OrderStatus } from "@prisma/client";
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

export async function generateOrderNumber(tx?: any): Promise<string> {
  const client = tx || prisma;
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const prefix = `ORD-${stamp}-`;

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Find today's orders with this daily prefix to determine highest sequence
  const todayOrders = await client.order.findMany({
    where: {
      orderNumber: { startsWith: prefix },
    },
    select: { orderNumber: true },
    orderBy: { orderNumber: "desc" },
  });

  let maxSeq = 0;
  for (const o of todayOrders) {
    const parts = o.orderNumber.split("-");
    const lastPart = parts[parts.length - 1];
    const num = parseInt(lastPart, 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  }

  // If no sequential format exists today yet, fallback to today's order count
  if (maxSeq === 0) {
    const count = await client.order.count({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });
    maxSeq = count;
  }

  let seq = maxSeq + 1;
  let candidate = `${prefix}${String(seq).padStart(4, "0")}`;

  // Ensure 100% collision-proof uniqueness
  while (await client.order.findUnique({ where: { orderNumber: candidate }, select: { id: true } })) {
    seq++;
    candidate = `${prefix}${String(seq).padStart(4, "0")}`;
  }

  return candidate;
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

  // 1. Try finding by ID first
  if (pid && !isNaN(pid) && pid > 0 && pid <= MAX_INT) {
    product = await prisma.product.findUnique({
      where: { id: pid },
      include: { category: true },
    });

    if (product) {
      if (product.deletedAt) {
        try {
          product = await prisma.product.update({
            where: { id: product.id },
            data: { deletedAt: null },
            include: { category: true },
          });
        } catch {}
      }
      return product;
    }
  }

  const cleanName = name && typeof name === "string" ? name.trim() : "";

  // 2. If product was NOT found by ID, search by name / nameKm
  if (cleanName) {
    const foundByName = await prisma.product.findFirst({
      where: {
        OR: [
          { name: cleanName },
          { nameKm: cleanName },
          { name: { equals: cleanName, mode: "insensitive" } },
          { nameKm: { equals: cleanName, mode: "insensitive" } },
        ],
      },
      include: { category: true },
    });
    if (foundByName) {
      product = foundByName;
    }
  }

  // 3. Dynamic Auto-Creation: If a real product name was sent but no match exists yet
  if (!product && cleanName) {
    try {
      let defaultCategory = await prisma.category.findFirst({ where: { deletedAt: null }, orderBy: { id: "asc" } });
      if (!defaultCategory) {
        defaultCategory = await prisma.category.findFirst({ orderBy: { id: "asc" } });
      }
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
          nameKm: cleanName,
          slug: uniqueSlug,
          basePrice: price && !isNaN(price) && price > 0 ? price : 0,
          categoryId: defaultCategory.id,
          isAvailable: true,
          trackStock: false,
        },
        include: { category: true },
      });
    } catch (err: any) {
      console.error("Auto-creating product failed error details:", err?.message || err);
      try {
        let defaultCategory = await prisma.category.findFirst({ orderBy: { id: "asc" } });
        if (defaultCategory) {
          product = await prisma.product.create({
            data: {
              name: cleanName,
              nameKm: cleanName,
              slug: `product-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
              basePrice: price && !isNaN(price) && price > 0 ? price : 0,
              categoryId: defaultCategory.id,
              isAvailable: true,
              trackStock: false,
            },
            include: { category: true },
          });
        }
      } catch (fallbackErr: any) {
        console.error("Secondary auto-creation failed:", fallbackErr?.message || fallbackErr);
      }
    }
  }

  // 4. Fallback: Return any available active product if non-resolvable
  if (!product) {
    product = await prisma.product.findFirst({
      where: { deletedAt: null },
      orderBy: { id: "asc" },
      include: { category: true },
    });
    if (!product) {
      product = await prisma.product.findFirst({
        orderBy: { id: "asc" },
        include: { category: true },
      });
    }
  }

  // If the matched product was soft-deleted, automatically restore it so active queries include it
  if (product && product.deletedAt) {
    try {
      product = await prisma.product.update({
        where: { id: product.id },
        data: { deletedAt: null },
        include: { category: true },
      });
    } catch {
      // Ignore update error if any
    }
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

  // 1. Batch lookup existing products to avoid multiple roundtrips inside the transaction
  const validProductIds = rawItems
    .map((item) => Number(item.productId))
    .filter((id) => !isNaN(id) && id > 0 && id <= MAX_INT);

  const resolvedProductsMap = new Map<number, any>();
  if (validProductIds.length > 0) {
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: validProductIds } },
      include: { category: true },
    });
    for (const p of existingProducts) {
      resolvedProductsMap.set(p.id, p);
    }
  }

  // Pre-resolve any missing products before opening transaction
  for (const item of rawItems) {
    const pId = Number(item.productId);
    if (!resolvedProductsMap.has(pId)) {
      const itemName = (item as any).name || (item as any).productName || (item as any).title;
      const itemPrice = toNum(item.unitPrice ?? item.price ?? 0);
      const product = await findProductSafely(item.productId, itemName, itemPrice);
      if (product) {
        resolvedProductsMap.set(pId, product);
        resolvedProductsMap.set(product.id, product);
      }
    }
  }

  return prisma.$transaction(async (tx) => {
    let calculatedSubtotal = 0;
    const itemsToCreate = [];
    const stockTrackedItems: { productId: number; product: any; quantity: number }[] = [];

    for (const item of rawItems) {
      const pId = Number(item.productId);
      const product = resolvedProductsMap.get(pId) || resolvedProductsMap.get(Number(item.productId));
      if (!product) {
        const itemName = (item as any).name || (item as any).productName || (item as any).title;
        throw new Error(`Unable to resolve product for item: "${itemName || item.productId}"`);
      }

      const qty = Math.max(1, Number(item.quantity || 1));
      const itemPrice = toNum(item.unitPrice ?? item.price ?? 0);
      const finalPrice = itemPrice > 0 ? itemPrice : toNum(product?.basePrice ?? 0);
      const totalPrice = toNum(item.totalPrice ?? (finalPrice * qty));

      calculatedSubtotal += totalPrice;

      itemsToCreate.push({
        productId: product.id,
        quantity: qty,
        unitPrice: finalPrice,
        totalPrice: totalPrice,
        notes: item.notes || null,
      });

      if (product.trackStock) {
        stockTrackedItems.push({
          productId: product.id,
          product,
          quantity: qty,
        });
      }
    }

    // Batch validate stock for tracked items
    if (stockTrackedItems.length > 0) {
      const trackIds = Array.from(new Set(stockTrackedItems.map((s) => s.productId)));
      const inventories = await tx.inventory.findMany({
        where: { productId: { in: trackIds } },
      });
      const invMap = new Map<number, number>(inventories.map((i) => [i.productId, Number(i.quantity)]));

      for (const { productId, product, quantity } of stockTrackedItems) {
        const available = invMap.get(productId) ?? 0;
        if (available < quantity) {
          throw new Error(`Insufficient stock for product ${product.name}. Available: ${available} ${product.unit || "units"}`);
        }
      }
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

    // Deduct stock for items where trackStock is enabled
    for (const { productId, quantity } of stockTrackedItems) {
      await tx.inventory.update({
        where: { productId },
        data: { quantity: { decrement: quantity } },
      });
      await tx.stockTransaction.create({
        data: {
          productId,
          type: "sale",
          quantity: -quantity,
          referenceId: created.orderNumber,
          userId: userId || null,
        },
      });
    }

    return formatOrder(created);
  });
};

export const updateOrderStatus = async (id: number, status: string, userId?: number, notes?: string) => {
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
    data: {
      status: newStatus as OrderStatus,
      ...(notes !== undefined ? { notes } : {}),
    },
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

  let calculatedSubtotal = 0;

  // Track existing items by id or productId so their IDs and statuses are preserved
  const existingItemsById = new Map<number, (typeof current.items)[0]>();
  const existingItemsByProduct = new Map<number, (typeof current.items)[0]>();
  for (const it of current.items) {
    existingItemsById.set(it.id, it);
    existingItemsByProduct.set(it.productId, it);
  }

  const processedItemIds = new Set<number>();

  for (const item of rawItems) {
    const itemName = (item as any).name || (item as any).productName || (item as any).title;
    const itemPrice = toNum(item.unitPrice ?? item.price ?? 0);
    const product = await findProductSafely(item.productId, itemName, itemPrice);

    if (!product) {
      throw new Error(`Unable to resolve or create product for item: "${itemName || item.productId}"`);
    }

    const qty = Math.max(1, Number(item.quantity || 1));
    const finalPrice = itemPrice > 0 ? itemPrice : toNum(product.basePrice ?? 0);
    const totalPrice = toNum(item.totalPrice ?? (finalPrice * qty));

    calculatedSubtotal += totalPrice;

    // Check if this item already existed in the order
    const rawItemId = (item as any).id ? Number((item as any).id) : undefined;
    const existing = (rawItemId && existingItemsById.get(rawItemId)) || existingItemsByProduct.get(product.id);

    if (existing) {
      processedItemIds.add(existing.id);
      await prisma.orderItem.update({
        where: { id: existing.id },
        data: {
          quantity: qty,
          unitPrice: finalPrice,
          totalPrice: totalPrice,
          notes: item.notes || null,
        },
      });
    } else {
      const createdItem = await prisma.orderItem.create({
        data: {
          orderId: id,
          productId: product.id,
          quantity: qty,
          unitPrice: finalPrice,
          totalPrice: totalPrice,
          notes: item.notes || null,
        },
      });
      processedItemIds.add(createdItem.id);
    }
  }

  // Delete only the items that were removed from the order
  const toDelete = current.items.filter((it) => !processedItemIds.has(it.id));
  if (toDelete.length > 0) {
    await prisma.orderItem.deleteMany({
      where: { id: { in: toDelete.map((d) => d.id) } },
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
