import { prisma } from "../src/config/prisma.js";

async function main() {
  const updated = await prisma.product.update({
    where: { id: 77 },
    data: { prepTime: 1 },
  });
  console.log("Updated Coca-Cola in DB:", updated);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
