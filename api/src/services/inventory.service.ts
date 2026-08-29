import { prisma } from "../config/prisma.js";
import { createProduct } from "./product.service.js";

export const getOrCreateInventory = async (productId: number) => {
  const existing = await prisma.inventory.findUnique({
    where: { productId },
  });

  if (existing) return existing;

  return prisma.inventory.create({
    data: {
      productId,
      quantity: 0,
      minStock: 0,
    },
  });
};

export const listInventory = async () => {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    include: {
      category: true,
      supplier: true,
      inventory: true,
    },
    orderBy: { name: "asc" },
  });

  // Ensure all products have an inventory record
  const result = [];
  for (const product of products) {
    if (!product.inventory) {
      const inv = await getOrCreateInventory(product.id);
      result.push({
        ...product,
        inventory: inv,
      });
    } else {
      result.push(product);
    }
  }

  return result;
};

export const adjustStock = async (
  productId: number,
  quantity: number,
  type: "restock" | "sale" | "damage" | "adjustment" | "return" | "expired",
  referenceId: string | null = null,
  notes: string | null = null,
  userId: number | null = null,
) => {
  return prisma.$transaction(async (tx) => {
    // 1. Get or create inventory
    let inventory = await tx.inventory.findUnique({
      where: { productId },
    });

    if (!inventory) {
      inventory = await tx.inventory.create({
        data: { productId, quantity: 0, minStock: 0 },
      });
    }

    const currentQty = Number(inventory.quantity);
    const newQty = currentQty + quantity;

    // Update inventory
    const updatedInventory = await tx.inventory.update({
      where: { productId },
      data: { quantity: newQty },
    });

    // Create stock transaction
    const transaction = await tx.stockTransaction.create({
      data: {
        productId,
        type,
        quantity,
        referenceId,
        notes,
        userId,
      },
    });

    return { inventory: updatedInventory, transaction };
  });
};

export const updateInventorySettings = async (
  productId: number,
  data: {
    trackStock?: boolean;
    minStock?: number;
    unit?: string;
    name?: string;
    quantity?: number;
  },
  userId: number | null = null,
) => {
  return prisma.$transaction(async (tx) => {
    // 1. Update product fields if provided (trackStock, unit, name, supplierId)
    const productUpdateData: any = {};
    if (data.trackStock !== undefined) productUpdateData.trackStock = data.trackStock;
    if (data.unit !== undefined) productUpdateData.unit = data.unit;
    if (data.name !== undefined) productUpdateData.name = data.name;
    if ((data as any).supplierId !== undefined) productUpdateData.supplierId = (data as any).supplierId ? Number((data as any).supplierId) : null;

    if (Object.keys(productUpdateData).length > 0) {
      await tx.product.update({
        where: { id: productId },
        data: productUpdateData,
      });
    }

    // 2. Fetch current inventory level
    let inventory = await tx.inventory.findUnique({
      where: { productId },
    });

    if (!inventory) {
      inventory = await tx.inventory.create({
        data: {
          productId,
          quantity: data.quantity ?? 0,
          minStock: data.minStock ?? 0,
        },
      });

      if (data.quantity && data.quantity > 0) {
        await tx.stockTransaction.create({
          data: {
            productId,
            type: "adjustment",
            quantity: data.quantity,
            notes: "Initial stock adjustment on update",
            userId,
          },
        });
      }
    } else {
      const updateData: any = {};
      if (data.minStock !== undefined) updateData.minStock = data.minStock;

      if (data.quantity !== undefined && Number(inventory.quantity) !== Number(data.quantity)) {
        updateData.quantity = data.quantity;
        const diff = Number(data.quantity) - Number(inventory.quantity);
        await tx.stockTransaction.create({
          data: {
            productId,
            type: "adjustment",
            quantity: diff,
            notes: "Manual override of stock level",
            userId,
          },
        });
      }

      await tx.inventory.update({
        where: { productId },
        data: updateData,
      });
    }

    return tx.product.findUnique({
      where: { id: productId },
      include: { inventory: true, category: true },
    });
  });
};

export const listStockTransactions = async (productId?: number) => {
  const where: any = {};
  if (productId) {
    where.productId = productId;
  }

  return prisma.stockTransaction.findMany({
    where,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          unit: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

function slugify(value: string): string {
  return (
    String(value)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "product"
  );
}

async function uniqueProductSlugTx(tx: any, value: string): Promise<string> {
  const base = slugify(value);
  let slug = base;
  let suffix = 2;

  while (
    await tx.product.findFirst({
      where: { slug },
      select: { id: true },
    })
  ) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export const addInventoryItem = async (
  data: {
    name: string;
    unit: string;
    quantity: number;
    minStock: number;
    supplierId?: number | null;
  },
  userId: number | null = null,
) => {
  return prisma.$transaction(async (tx) => {
    // 1. Find or create default category "Inventory"
    let category = await tx.category.findFirst({
      where: { slug: "inventory" },
    });

    if (!category) {
      category = await tx.category.create({
        data: {
          name: "Inventory",
          slug: "inventory",
          description: "Default category for inventory stock items",
        },
      });
    }

    // 2. Generate a unique slug transaction-safely
    const slug = await uniqueProductSlugTx(tx, data.name);

    // 3. Create the product directly using the transaction client (tx)
    const product = await tx.product.create({
      data: {
        categoryId: category.id,
        supplierId: data.supplierId ? Number(data.supplierId) : null,
        name: data.name,
        slug,
        basePrice: 0,
        unit: data.unit,
        trackStock: true,
        isAvailable: true,
        inventory: {
          create: {
            quantity: data.quantity,
            minStock: data.minStock,
          },
        },
      },
      include: {
        inventory: true,
        category: true,
      },
    });

    // 4. Create stock transaction if quantity > 0
    if (data.quantity > 0) {
      await tx.stockTransaction.create({
        data: {
          productId: product.id,
          type: "restock",
          quantity: data.quantity,
          notes: "Initial stock registration",
          userId,
        },
      });
    }

    return product;
  });
};
