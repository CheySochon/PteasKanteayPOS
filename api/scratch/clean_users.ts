import { prisma } from "../src/config/prisma.js";

async function main() {
  const result = await prisma.user.deleteMany({
    where: {
      email: {
        endsWith: "@pos.local",
      },
    },
  });
  console.log("Successfully deleted dummy users count:", result.count);

  const remainingUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true }
  });
  console.log("Remaining real database users:", remainingUsers);

  await prisma.$disconnect();
}

main().catch(console.error);
