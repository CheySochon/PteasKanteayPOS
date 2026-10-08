import { prisma } from "../src/config/prisma.js";

async function main() {
  console.log("Purging soft-deleted products and categories from PostgreSQL...");

  // 1. Delete order items or references pointing to soft-deleted products
  const deletedProducts = await prisma.product.findMany({
    where: { NOT: { deletedAt: null } },
    select: { id: true, name: true }
  });
  console.log("Soft-deleted products to purge:", deletedProducts);

  for (const prod of deletedProducts) {
    await prisma.orderItem.deleteMany({ where: { productId: prod.id } });
    await prisma.inventory.deleteMany({ where: { productId: prod.id } });
    await prisma.stockTransaction.deleteMany({ where: { productId: prod.id } });
    await prisma.purchaseOrderItem.deleteMany({ where: { productId: prod.id } });
    await prisma.product.delete({ where: { id: prod.id } });
  }

  // 2. Delete soft-deleted categories
  const deletedCategories = await prisma.category.findMany({
    where: { NOT: { deletedAt: null } },
    select: { id: true, name: true }
  });
  console.log("Soft-deleted categories to purge:", deletedCategories);

  for (const cat of deletedCategories) {
    await prisma.category.delete({ where: { id: cat.id } });
  }

  console.log("Hard purge of deleted categories and products completed successfully.");
  await prisma.$disconnect();
}

main().catch(console.error);
