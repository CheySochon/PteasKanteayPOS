import { prisma } from "../src/config/prisma.js";

async function main() {
  console.log("Wiping all products and categories from PostgreSQL database...");

  // 1. Clear references in dependent tables
  await prisma.orderItem.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.stockTransaction.deleteMany({});
  await prisma.inventory.deleteMany({});

  // 2. Delete all products
  const prodRes = await prisma.product.deleteMany({});
  console.log("Successfully deleted products count:", prodRes.count);

  // 3. Delete all categories
  const catRes = await prisma.category.deleteMany({});
  console.log("Successfully deleted categories count:", catRes.count);

  const remainingProducts = await prisma.product.count();
  const remainingCategories = await prisma.category.count();

  console.log(`\nVerification: Products count = ${remainingProducts}, Categories count = ${remainingCategories}`);
  await prisma.$disconnect();
}

main().catch(console.error);
