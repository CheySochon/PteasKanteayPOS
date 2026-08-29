import { prisma } from "../config/prisma.js";

export const listPurchaseOrders = async () => {
  return prisma.purchaseOrder.findMany({
    include: {
      supplier: true,
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const createPurchaseOrder = async (data: {
  supplierId: number;
  expectedDeliveryDate?: string;
  notes?: string;
  createdById?: number;
  items: Array<{
    productId: number;
    quantity: number;
    unitCost: number;
  }>;
}) => {
  const count = await prisma.purchaseOrder.count();
  const dateStr = new Date().toISOString().replace(/-/g, "").substring(0, 8);
  const poNumber = `PO-${dateStr}-${String(count + 1).padStart(3, "0")}`;

  let totalAmount = 0;
  const itemData = data.items.map((i) => {
    const totalCost = Number((i.quantity * i.unitCost).toFixed(2));
    totalAmount += totalCost;
    return {
      productId: i.productId,
      quantity: i.quantity,
      unitCost: i.unitCost,
      totalCost,
    };
  });

  return prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierId: data.supplierId,
      notes: data.notes || null,
      createdById: data.createdById || null,
      expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
      totalAmount,
      status: "ordered",
      items: {
        create: itemData,
      },
    },
    include: {
      supplier: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });
};

export const receivePurchaseOrderStock = async (poId: number, userId: number | null = null) => {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: {
      supplier: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!po) {
    throw new Error("Purchase Order not found");
  }

  if (po.status === "received") {
    return po;
  }

  return prisma.$transaction(async (tx) => {
    // 1. Update PO status to received
    const updatedPo = await tx.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: "received",
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // 2. Add quantities to product inventories & create stock transactions
    for (const item of po.items) {
      let inv = await tx.inventory.findUnique({
        where: { productId: item.productId },
      });

      if (!inv) {
        inv = await tx.inventory.create({
          data: {
            productId: item.productId,
            quantity: 0,
            minStock: 0,
          },
        });
      }

      const currentQty = Number(inv.quantity);
      const addedQty = Number(item.quantity);
      const newQty = currentQty + addedQty;

      await tx.inventory.update({
        where: { productId: item.productId },
        data: { quantity: newQty },
      });

      await tx.stockTransaction.create({
        data: {
          productId: item.productId,
          type: "restock",
          quantity: addedQty,
          referenceId: po.poNumber,
          notes: `Received PO ${po.poNumber} from ${po.supplier.name}`,
          userId,
        },
      });
    }

    return updatedPo;
  });
};
