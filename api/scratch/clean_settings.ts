import { prisma } from "../src/config/prisma.js";

async function main() {
  console.log("Checking AppSettings in database...");
  const settings = await prisma.appSetting.findMany();
  console.log("Current AppSettings:", settings);

  // Update or reset restaurant details keys to clean empty values
  const defaultKeys = [
    { key: "restaurantName", value: "" },
    { key: "restaurantEmail", value: "" },
    { key: "restaurantPhone", value: "" },
    { key: "address", value: "" },
    { key: "vatTin", value: "" },
  ];

  for (const item of defaultKeys) {
    await prisma.appSetting.upsert({
      where: { key: item.key },
      update: { value: item.value },
      create: { key: item.key, value: item.value, category: "general", description: item.key },
    });
  }

  console.log("AppSettings successfully cleaned in PostgreSQL database.");
  await prisma.$disconnect();
}

main().catch(console.error);
