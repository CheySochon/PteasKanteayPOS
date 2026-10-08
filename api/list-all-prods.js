import { prisma } from "./src/config/prisma.js";

async function main() {
  const prods = await prisma.product.findMany({});
  console.log(`Found ${prods.length} products:`);
  prods.forEach(p => {
    console.log(`ID: ${p.id} | name: "${p.name}" | nameKm: "${p.nameKm}" | price: $${p.basePrice} | deletedAt: ${p.deletedAt}`);
  });
}

main().finally(() => prisma.$disconnect());
