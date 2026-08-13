import { prisma } from "../src/config/prisma.js";

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      imageUrl: true,
      isAvailable: true,
    }
  });
  console.log("Database products:", JSON.stringify(products, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
