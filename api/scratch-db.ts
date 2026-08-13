import { prisma } from "./src/config/prisma.js";

async function main() {
  console.log("Cleaning up simulated test products...");
  
  // 1. Delete stock transactions for the test products first
  await prisma.stockTransaction.deleteMany({
    where: {
      product: {
        slug: {
          startsWith: "test-product"
        }
      }
    }
  });

  // 2. Delete inventory records for the test products
  await prisma.inventory.deleteMany({
    where: {
      product: {
        slug: {
          startsWith: "test-product"
        }
      }
    }
  });

  // 3. Delete the products
  const result = await prisma.product.deleteMany({
    where: {
      slug: {
        startsWith: "test-product"
      }
    }
  });

  console.log(`Cleaned up ${result.count} simulated products successfully.`);
}

main()
  .catch((e) => {
    console.error("Cleanup error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
