const { prisma } = require('../lib/prisma');
const { emitOrderCreated, emitOrderUpdated } = require('../lib/socket');
const { addTelegramJob } = require('../queues/telegramQueue');
const { addInventoryDeductionJob } = require('../queues/inventoryQueue');

const ALLOWED_STATUSES = ['pending', 'accepted', 'preparing', 'ready', 'served', 'completed', 'cancelled'];

function number(value) {
  return Number(value || 0);
}

function normalizeStatus(status) {
  const normalized = String(status || 'pending').toLowerCase();
  return ALLOWED_STATUSES.includes(normalized) ? normalized : 'pending';
}

function formatOrder(order) {
  if (!order) return order;
  return {
    ...order,
    orderId: order.orderNumber,
    tableNo: order.table?.name || null,
    subtotal: number(order.subtotal),
    discountAmount: number(order.discountAmount),
    taxAmount: number(order.taxAmount),
    totalAmount: number(order.totalAmount),
  };
}

function buildOrderInclude() {
  return {
    table: true,
    customer: true,
    createdBy: { include: { role: true } },
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

async function generateOrderNumber(tx = prisma) {
  const date = new Date();
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
  const count = await tx.order.count({
    where: {
      createdAt: {
        gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      },
    },
  });
  return `ORD-${stamp}-${String(count + 1).padStart(4, '0')}`;
}

async function listOrders(query = {}) {
  const where = { deletedAt: null };
  if (query.status) where.status = normalizeStatus(query.status);

  const orders = await prisma.order.findMany({
    where,
    include: buildOrderInclude(),
    orderBy: { createdAt: 'desc' },
  });

  return orders.map(formatOrder);
}

async function getOrder(id) {
  const order = await prisma.order.findFirst({
    where: { id: Number(id), deletedAt: null },
    include: buildOrderInclude(),
  });

  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    throw err;
  }

  return formatOrder(order);
}

async function validateTable(tableId, tx = prisma) {
  if (!tableId) return null;
  const table = await tx.diningTable.findFirst({
    where: { id: Number(tableId), deletedAt: null, isActive: true },
  });
  if (!table) {
    const err = new Error('Table not found');
    err.status = 404;
    throw err;
  }
  return table;
}

async function findOrCreateLegacyTable(tableNo, tx = prisma) {
  if (!tableNo) return null;
  const name = String(tableNo);
  const qrToken = `table-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return tx.diningTable.upsert({
    where: { name },
    update: {},
    create: {
      name,
      qrToken,
      capacity: 2,
      zone: 'indoor',
    },
  });
}

async function calculateItems(items = [], tx = prisma) {
  const calculatedItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = await tx.product.findFirst({
      where: { id: Number(item.productId), deletedAt: null, isAvailable: true },
      include: {
        variants: true,
        modifierMaps: { include: { modifier: true } },
      },
    });

    if (!product) {
      const err = new Error(`Product not found: ${item.productId}`);
      err.status = 400;
      throw err;
    }

    let variant = null;
    let unitPrice = number(product.basePrice);

    if (item.variantId) {
      variant = product.variants.find((entry) => entry.id === Number(item.variantId) && entry.isAvailable && !entry.deletedAt);
      if (!variant) {
        const err = new Error(`Variant not found: ${item.variantId}`);
        err.status = 400;
        throw err;
      }
      unitPrice = number(variant.price);
    }

    const modifierIds = item.modifierIds || [];
    const modifiers = [];
    let modifierTotal = 0;

    for (const modifierId of modifierIds) {
      const map = product.modifierMaps.find((entry) => entry.modifierId === Number(modifierId) && entry.modifier.isAvailable && !entry.modifier.deletedAt);
      if (!map) {
        const err = new Error(`Modifier is not available for product: ${modifierId}`);
        err.status = 400;
        throw err;
      }
      const price = number(map.modifier.price);
      modifierTotal += price;
      modifiers.push({ modifierId: Number(modifierId), price });
    }

    const quantity = Number(item.quantity || 1);
    const totalPrice = (unitPrice + modifierTotal) * quantity;
    subtotal += totalPrice;

    calculatedItems.push({
      productId: product.id,
      variantId: variant?.id,
      quantity,
      unitPrice,
      totalPrice,
      notes: item.notes,
      modifiers,
    });
  }

  return { calculatedItems, subtotal };
}

async function createOrder(payload, userId) {
  const created = await prisma.$transaction(async (tx) => {
    let table = await validateTable(payload.tableId, tx);
    if (!table && payload.tableNo) {
      table = await findOrCreateLegacyTable(payload.tableNo, tx);
    }

    let subtotal = number(payload.totalAmount);
    let calculatedItems = [];

    if (Array.isArray(payload.items) && payload.items.length > 0) {
      const calculated = await calculateItems(payload.items, tx);
      subtotal = calculated.subtotal;
      calculatedItems = calculated.calculatedItems;
    }

    const discountAmount = number(payload.discountAmount);
    const taxAmount = number(payload.taxAmount);
    const totalAmount = Math.max(subtotal - discountAmount + taxAmount, 0);

    return tx.order.create({
      data: {
        orderNumber: payload.orderNumber || payload.orderId || await generateOrderNumber(tx),
        tableId: table?.id,
        customerId: payload.customerId ? Number(payload.customerId) : undefined,
        createdById: userId || undefined,
        status: normalizeStatus(payload.status),
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        notes: payload.notes,
        items: calculatedItems.length > 0 ? {
          create: calculatedItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            notes: item.notes,
            modifiers: item.modifiers.length > 0 ? {
              create: item.modifiers,
            } : undefined,
          })),
        } : undefined,
      },
      include: buildOrderInclude(),
    });
  });

  const formatted = formatOrder(created);
  emitOrderCreated(formatted);
  await addTelegramJob({
    type: 'new_order',
    title: 'New order',
    text: `New order ${formatted.orderNumber} total $${formatted.totalAmount.toFixed(2)}`,
    orderId: formatted.id,
  });
  await addInventoryDeductionJob({ orderId: formatted.id });
  return formatted;
}

async function updateStatus(id, status) {
  const order = await prisma.order.update({
    where: { id: Number(id) },
    data: { status: normalizeStatus(status) },
    include: buildOrderInclude(),
  });

  const formatted = formatOrder(order);
  emitOrderUpdated(formatted);

  if (['accepted', 'completed'].includes(formatted.status)) {
    await addInventoryDeductionJob({ orderId: formatted.id });
  }

  return formatted;
}

async function addItem(orderId, payload) {
  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: Number(orderId) } });
    if (!order) {
      const err = new Error('Order not found');
      err.status = 404;
      throw err;
    }

    const { calculatedItems, subtotal } = await calculateItems([payload], tx);
    const item = calculatedItems[0];

    await tx.orderItem.create({
      data: {
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        notes: item.notes,
        modifiers: item.modifiers.length > 0 ? { create: item.modifiers } : undefined,
      },
    });

    return tx.order.update({
      where: { id: order.id },
      data: {
        subtotal: { increment: subtotal },
        totalAmount: { increment: subtotal },
      },
      include: buildOrderInclude(),
    });
  });

  const formatted = formatOrder(updated);
  emitOrderUpdated(formatted);
  return formatted;
}

async function splitBill(id, splits = []) {
  const order = await getOrder(id);
  const totalSplit = splits.reduce((sum, split) => sum + number(split.amount), 0);

  if (Math.abs(totalSplit - order.totalAmount) > 0.01) {
    const err = new Error('Split total must equal order total');
    err.status = 400;
    throw err;
  }

  return { orderId: order.id, totalAmount: order.totalAmount, splits };
}

async function deleteOrder(id) {
  return prisma.order.update({
    where: { id: Number(id) },
    data: { deletedAt: new Date() },
  });
}

module.exports = {
  formatOrder,
  listOrders,
  getOrder,
  createOrder,
  updateStatus,
  addItem,
  splitBill,
  deleteOrder,
  normalizeStatus,
};
