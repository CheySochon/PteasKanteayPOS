import { prisma } from "../src/config/prisma.js";

async function main() {
  // Ensure Cashier User (ID 40) is NOT in Group ID 1 (Admin)
  await prisma.userGroup.deleteMany({
    where: {
      groupId: 1,
      user: {
        email: "cashier@pos.local",
      },
    },
  });

  const finalGroup1 = await prisma.group.findUnique({
    where: { id: 1 },
    include: {
      userGroups: { include: { user: true } },
      groupPermissions: { include: { permission: true } },
    },
  });

  console.log("=== FINAL CLEAN POSTGRESQL RECORD FOR GROUP ID 1 (ADMIN) ===");
  console.log(JSON.stringify(finalGroup1, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
