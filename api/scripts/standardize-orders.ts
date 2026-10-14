import { prisma } from "../src/config/prisma.js";

async function run() {
  const orders = await prisma.order.findMany({
    select: { id: true, orderNumber: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, typeof orders>();
  for (const o of orders) {
    const d = o.createdAt;
    const key = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(o);
  }

  // 1. First assign temporary numbers to avoid unique constraint collision during swap
  for (const o of orders) {
    await prisma.order.update({
      where: { id: o.id },
      data: { orderNumber: `TEMP-${o.id}-${Date.now()}` },
    });
  }

  // 2. Assign clean standardized sequential numbers
  for (const [day, list] of groups.entries()) {
    for (let index = 0; index < list.length; index++) {
      const ord = list[index];
      const newNum = `ORD-${day}-${String(index + 1).padStart(4, "0")}`;
      await prisma.order.update({
        where: { id: ord.id },
        data: { orderNumber: newNum },
      });
      console.log(`Order ID ${ord.id}: ${ord.orderNumber} -> ${newNum}`);
    }
  }

  console.log("Standardization complete!");
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
