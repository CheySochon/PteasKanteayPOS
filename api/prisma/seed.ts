import bcrypt from "bcrypt";
import { prisma } from "../src/config/prisma.js";
import { TableZone } from "../src/prisma/client.js";

function slugify(value: string) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function upsertByName(model: string, name: string, data: any) {
  const existing = await (prisma as any)[model].findFirst({ where: { name } });
  if (existing) {
    return (prisma as any)[model].update({
      where: { id: existing.id },
      data,
    });
  }
  return (prisma as any)[model].create({ data: { name, ...data } });
}

async function main() {
  const roles: Record<string, { id: number; name: string }> = {};
  for (const name of ["Admin", "Cashier", "Staff", "Member"]) {
    roles[name] = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  await prisma.user.upsert({
    where: { email: "cheychon258@gmail.com" },
    update: {
      name: "Admin",
      password: await bcrypt.hash("password123", 10),
      roleId: roles.Admin.id,
      isActive: true,
      deletedAt: null,
    },
    create: {
      name: "Admin",
      email: "cheychon258@gmail.com",
      password: await bcrypt.hash("password123", 10),
      roleId: roles.Admin.id,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "cashier@pos.local" },
    update: {
      name: "Cashier User",
      password: await bcrypt.hash("password123", 10),
      roleId: roles.Cashier.id,
      isActive: true,
      deletedAt: null,
    },
    create: {
      name: "Cashier User",
      email: "cashier@pos.local",
      password: await bcrypt.hash("password123", 10),
      roleId: roles.Cashier.id,
      isActive: true,
    },
  });

  const categories: Record<string, { id: number; name: string }> = {};
  for (const name of ["Coffee", "Tea", "Frappe", "Food", "Dessert"]) {
    categories[name] = await prisma.category.upsert({
      where: { slug: slugify(name) },
      update: { name, deletedAt: null },
      create: { name, slug: slugify(name) },
    });
  }

  const productDefinitions = [
    {
      category: "Coffee",
      name: "Americano",
      description: "Espresso with hot water.",
      price: 2.0,
    },
    {
      category: "Coffee",
      name: "Latte",
      description: "Espresso with steamed milk.",
      price: 2.5,
    },
    {
      category: "Coffee",
      name: "Cappuccino",
      description: "Espresso, milk, and foam.",
      price: 2.5,
    },
    {
      category: "Tea",
      name: "Green Tea",
      description: "Fresh brewed green tea.",
      price: 2.75,
    },
    {
      category: "Frappe",
      name: "Chocolate Frappe",
      description: "Iced blended chocolate drink.",
      price: 3.5,
    },
    {
      category: "Food",
      name: "Croissant",
      description: "Buttery baked croissant.",
      price: 2.25,
    },
    {
      category: "Dessert",
      name: "Cheesecake",
      description: "Classic cheesecake slice.",
      price: 3.25,
    },
  ];

  const products: Record<string, { id: number }> = {};
  for (const definition of productDefinitions) {
    const slug = slugify(definition.name);
    const basePrice = definition.price;
    const product = await prisma.product.upsert({
      where: { slug },
      update: {
        categoryId: categories[definition.category].id,
        name: definition.name,
        description: definition.description,
        basePrice,
        isAvailable: true,
        deletedAt: null,
      },
      create: {
        categoryId: categories[definition.category].id,
        name: definition.name,
        slug,
        description: definition.description,
        basePrice,
        isAvailable: true,
      },
    });
    products[definition.name] = product;
  }

  const tables = [
    ["T1", 2, "indoor", "table-t-1"],
    ["T2", 2, "indoor", "table-t-2"],
    ["T3", 4, "indoor", "table-t-3"],
    ["T4", 4, "outdoor", "table-t-4"],
    ["VIP1", 6, "vip", "table-vip-1"],
  ] as [string, number, TableZone, string][];

  for (const [name, capacity, zone, qrToken] of tables) {
    await prisma.diningTable.upsert({
      where: { name },
      update: { capacity, zone, qrToken, isActive: true, deletedAt: null },
      create: { name, capacity, zone, qrToken, isActive: true },
    });
  }

  console.log(
    "Seed completed: roles, admin user, categories, products, modifiers, and tables.",
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
