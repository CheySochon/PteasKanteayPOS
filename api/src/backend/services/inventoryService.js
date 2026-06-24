const { prisma } = require('../lib/prisma');
const { emitLowStockAlert } = require('../lib/socket');
const { addTelegramJob } = require('../queues/telegramQueue');

function number(value) {
  return Number(value || 0);
}

async function listIngredients() {
  return prisma.ingredient.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
  });
}

async function createIngredient(data) {
  return prisma.ingredient.create({
    data: {
      name: data.name,
      unit: data.unit,
      currentStock: data.currentStock || 0,
      minStock: data.minStock || 0,
      costPerUnit: data.costPerUnit || 0,
    },
  });
}

async function updateIngredient(id, data) {
  return prisma.ingredient.update({
    where: { id: Number(id) },
    data: {
      name: data.name,
      unit: data.unit,
      currentStock: data.currentStock,
      minStock: data.minStock,
      costPerUnit: data.costPerUnit,
    },
  });
}

async function deleteIngredient(id) {
  return prisma.ingredient.update({
    where: { id: Number(id) },
    data: { deletedAt: new Date() },
  });
}

async function listStockMovements() {
  return prisma.stockMovement.findMany({
    include: { ingredient: true, order: true, createdBy: true },
    orderBy: { createdAt: 'desc' },
  });
}

async function createStockAdjustment({ ingredientId, quantity, type = 'adjustment', reason, createdById }) {
  const qty = number(quantity);
  const ingredient = await prisma.ingredient.findUnique({ where: { id: Number(ingredientId) } });
  if (!ingredient) {
    const err = new Error('Ingredient not found');
    err.status = 404;
    throw err;
  }

  const delta = type === 'out' ? -qty : qty;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.ingredient.update({
      where: { id: ingredient.id },
      data: { currentStock: { increment: delta } },
    });

    const movement = await tx.stockMovement.create({
      data: {
        ingredientId: ingredient.id,
        quantity: qty,
        type,
        reason,
        createdById,
      },
      include: { ingredient: true },
    });

    await handleLowStock(updated);
    return movement;
  });
}

async function getLowStock() {
  const ingredients = await prisma.ingredient.findMany({ where: { deletedAt: null } });
  return ingredients.filter((ingredient) => number(ingredient.currentStock) <= number(ingredient.minStock));
}

async function deductIngredientsForOrder(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: Number(orderId) },
    include: {
      items: {
        include: {
          product: {
            include: {
              ingredients: true,
            },
          },
        },
      },
    },
  });

  if (!order) return null;

  const movements = [];

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      for (const mapping of item.product.ingredients) {
        const quantity = number(mapping.quantityRequired) * item.quantity;
        const updated = await tx.ingredient.update({
          where: { id: mapping.ingredientId },
          data: { currentStock: { decrement: quantity } },
        });

        movements.push(await tx.stockMovement.create({
          data: {
            ingredientId: mapping.ingredientId,
            type: 'out',
            quantity,
            reason: `Order ${order.orderNumber}`,
            orderId: order.id,
          },
        }));

        await handleLowStock(updated);
      }
    }
  });

  return movements;
}

async function handleLowStock(ingredient) {
  if (number(ingredient.currentStock) <= number(ingredient.minStock)) {
    const payload = {
      ingredientId: ingredient.id,
      name: ingredient.name,
      currentStock: number(ingredient.currentStock),
      minStock: number(ingredient.minStock),
    };

    emitLowStockAlert(payload);
    await addTelegramJob({
      type: 'low_stock',
      title: 'Low stock alert',
      text: `Low stock: ${ingredient.name} (${payload.currentStock} ${ingredient.unit})`,
    });
  }
}

module.exports = {
  listIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  listStockMovements,
  createStockAdjustment,
  getLowStock,
  deductIngredientsForOrder,
};
