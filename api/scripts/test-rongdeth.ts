import { prisma } from "../src/config/prisma.js";

async function main() {
  const rongdeth = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { contains: "RongDeth", mode: "insensitive" } },
        { email: { contains: "rongdeth", mode: "insensitive" } },
      ],
    },
    include: {
      userGroups: {
        include: {
          group: {
            include: {
              groupPermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  console.log("=== RONGDETH USER RECORD IN POSTGRESQL DB ===");
  console.log(JSON.stringify(rongdeth, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
