import { prisma } from "../src/config/prisma.js";

async function main() {
  console.log("Cleaning extra role groups in PostgreSQL...");

  // Delete all groups with ID > 1 or name in ["Store Manager", "Supervisor", "Cashier"]
  const res = await prisma.group.deleteMany({
    where: {
      OR: [
        { id: { gt: 1 } },
        { name: { in: ["Store Manager", "Supervisor", "Cashier"] } },
      ],
    },
  });

  console.log("Successfully deleted extra groups count:", res.count);

  const remainingGroups = await prisma.group.findMany({
    select: { id: true, name: true, description: true }
  });
  console.log("Remaining real database groups:", remainingGroups);

  await prisma.$disconnect();
}

main().catch(console.error);
