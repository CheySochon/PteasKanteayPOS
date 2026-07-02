import { prisma } from "../config/prisma.js";
import { StockMovementType } from "../prisma/client.js";

function toNum(value: unknown): number {
  return Number(value ?? 0);
}

export const listIngredients = async () => {
  return prisma.ingredient.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
};

export const createIngredient = async (data: {
  name: string;
  unit: string;
  currentStock?: number;
  minStock?: number;
  costPerUnit?: number;
}) => {
  return prisma.ingredient.create({
    data: {
      name: data.name,
      unit: data.unit,
      currentStock: data.currentStock ?? 0,
      minStock: data.minStock ?? 0,
      costPerUnit: data.costPerUnit ?? 0,
    },
  });
};

export const updateIngredient = async (
  id: number,
  data: {
    name?: string;
    unit?: string;
    currentStock?: number;
    minStock?: number;
    costPerUnit?: number;
  },
) => {
  return prisma.ingredient.update({
    where: { id },
    data: {
      name: data.name,
      unit: data.unit,
      currentStock: data.currentStock,
      minStock: data.minStock,
      costPerUnit: data.costPerUnit,
    },
  });
};

export const deleteIngredient = async (id: number) => {
  return prisma.ingredient.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};

export const listStockMovements = async () => {
  return prisma.stockMovement.findMany({
    include: { ingredient: true, order: true, createdBy: true },
    orderBy: { createdAt: "desc" },
  });
};

export const createStockAdjustment = async (data: {
  ingredientId: number;
  quantity: number;
  type?: string;
  reason?: string;
  createdById?: number;
}) => {
  const qty = toNum(data.quantity);
  const ingredient = await prisma.ingredient.findUnique({
    where: { id: data.ingredientId },
  });

  if (!ingredient) throw new Error("Ingredient not found");

  const delta = data.type === "out" ? -qty : qty;

  return prisma.$transaction(async (tx) => {
    await tx.ingredient.update({
      where: { id: ingredient.id },
      data: { currentStock: { increment: delta } },
    });

    return tx.stockMovement.create({
      data: {
        ingredientId: ingredient.id,
        quantity: qty,
        type: (data.type ?? "adjustment") as StockMovementType,
        reason: data.reason,
        createdById: data.createdById,
      },
      include: { ingredient: true },
    });
  });
};

export const getLowStock = async () => {
  const ingredients = await prisma.ingredient.findMany({
    where: { deletedAt: null },
  });
  return ingredients.filter(
    (i) => toNum(i.currentStock) <= toNum(i.minStock),
  );
};
