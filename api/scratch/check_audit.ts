import { prisma } from "../src/config/prisma.js";

async function main() {
  const count = await prisma.auditLog.count();
  console.log("Total Audit Logs:", count);
  
  const recent = await prisma.auditLog.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
  console.log("Recent Logs:", recent);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
