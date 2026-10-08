import { prisma } from "./src/config/prisma.js";

async function main() {
  console.log("Restoring all products in database (setting deletedAt = null)...");

  const result = await prisma.product.updateMany({
    where: { NOT: { deletedAt: null } },
    data: { deletedAt: null }
  });

  console.log(`Successfully restored ${result.count} products!`);

  const active = await prisma.product.findMany({
    select: { id: true, name: true, nameKm: true, basePrice: true }
  });

  console.log("Active products in DB now:");
  active.forEach(p => console.log(`- ID: ${p.id} | Name: "${p.name}" | NameKm: "${p.nameKm}" | Price: $${p.basePrice}`));
}

main().finally(() => prisma.$disconnect());
