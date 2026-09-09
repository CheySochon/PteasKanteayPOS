import { prisma } from "../src/config/prisma.js";

async function dropMigrationsTable() {
  console.log("Removing '_prisma_migrations' table from PostgreSQL database...");
  try {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;`);
    console.log("✅ Table '_prisma_migrations' dropped successfully from PostgreSQL database!");
  } catch (err) {
    console.error("❌ Failed to drop '_prisma_migrations' table:", err);
  } finally {
    await prisma.$disconnect();
  }
}

dropMigrationsTable();
