import { prisma } from "../src/config/prisma.js";

async function main() {
  const result = await prisma.diningTable.updateMany({
    where: {
      OR: [
        { name: { contains: "VIP", mode: "insensitive" } },
        { zone: "vip" as any }
      ]
    },
    data: {
      deletedAt: new Date(),
      isActive: false
    }
  });
  console.log("Deleted VIP tables count:", result.count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
