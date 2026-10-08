import { prisma } from "../src/config/prisma.js";

async function main() {
  const result = await prisma.auditLog.updateMany({
    where: { userName: "Admin" },
    data: { userName: "Cheysochon" },
  });
  console.log("Updated audit logs count:", result.count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
