import { prisma } from "../src/config/prisma.js";

async function check() {
  const settings = await prisma.appSetting.findMany();
  console.log("ALL SETTINGS IN DATABASE:");
  console.log(JSON.stringify(settings, null, 2));
}

check().catch(console.error);
