import { prisma } from "../src/config/prisma.js";

async function main() {
  const prods = await prisma.product.findMany({
    select: { id: true, name: true, trackStock: true, category: { select: { name: true } } }
  });
  console.log("=== PRODUCT STOCK TRACKING STATUS ===");
  console.log(JSON.stringify(prods, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
