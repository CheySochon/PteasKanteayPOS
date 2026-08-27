import { prisma } from "../src/config/prisma.js";

async function main() {
  const group = await prisma.group.findUnique({
    where: { id: 1 },
    include: {
      userGroups: {
        include: {
          user: true,
        },
      },
      groupPermissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  console.log("=== POSTGRESQL DATABASE RECORD FOR GROUP ID 1 ===");
  console.log(JSON.stringify(group, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
