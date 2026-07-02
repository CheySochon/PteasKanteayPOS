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
    where: { email: "admin@pos.local" },
    update: {
      name: "Admin",
      password: await bcrypt.hash("password123", 10),
      roleId: roles.Admin.id,
      isActive: true,
      deletedAt: null,
    },
    create: {
      name: "Admin",
      email: "admin@pos.local",
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
      variants: [
        ["Small", 2.0],
        ["Medium", 2.5],
        ["Large", 3.0],
      ] as [string, number][],
    },
    {
      category: "Coffee",
      name: "Latte",
      description: "Espresso with steamed milk.",
      variants: [
        ["Small", 2.5],
        ["Medium", 3.0],
        ["Large", 3.5],
      ] as [string, number][],
    },
    {
      category: "Coffee",
      name: "Cappuccino",
      description: "Espresso, milk, and foam.",
      variants: [
        ["Small", 2.5],
        ["Medium", 3.0],
        ["Large", 3.5],
      ] as [string, number][],
    },
    {
      category: "Tea",
      name: "Green Tea",
      description: "Fresh brewed green tea.",
      variants: [
        ["Medium", 2.75],
        ["Large", 3.25],
      ] as [string, number][],
    },
    {
      category: "Frappe",
      name: "Chocolate Frappe",
      description: "Iced blended chocolate drink.",
      variants: [
        ["Medium", 3.5],
        ["Large", 4.0],
      ] as [string, number][],
    },
    {
      category: "Food",
      name: "Croissant",
      description: "Buttery baked croissant.",
      variants: [["Regular", 2.25]] as [string, number][],
    },
    {
      category: "Dessert",
      name: "Cheesecake",
      description: "Classic cheesecake slice.",
      variants: [["Slice", 3.25]] as [string, number][],
    },
  ];

  const products: Record<string, { id: number }> = {};
  for (const definition of productDefinitions) {
    const slug = slugify(definition.name);
    const basePrice = definition.variants[0][1];
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

    for (const [variantName, price] of definition.variants) {
      const sku = `${slug}-${slugify(variantName)}`;
      await prisma.productVariant.upsert({
        where: { sku },
        update: {
          productId: product.id,
          name: variantName,
          price,
          isAvailable: true,
          deletedAt: null,
        },
        create: {
          productId: product.id,
          name: variantName,
          price,
          sku,
          isAvailable: true,
        },
      });
    }
  }

  const modifierDefinitions = [
    ["Extra Shot", 0.5],
    ["Less Sugar", 0.0],
    ["Normal Sugar", 0.0],
    ["Extra Sugar", 0.0],
    ["Oat Milk", 0.75],
    ["Whipped Cream", 0.5],
  ] as [string, number][];

  const modifiers: Record<string, { id: number }> = {};
  for (const [name, price] of modifierDefinitions) {
    modifiers[name] = await upsertByName("productModifier", name, {
      price,
      isAvailable: true,
      deletedAt: null,
    });
  }

  const drinkProducts = [
    "Americano",
    "Latte",
    "Cappuccino",
    "Green Tea",
    "Chocolate Frappe",
  ];
  for (const productName of drinkProducts) {
    for (const modifierName of Object.keys(modifiers)) {
      await prisma.productModifierMap.upsert({
        where: {
          productId_modifierId: {
            productId: products[productName].id,
            modifierId: modifiers[modifierName].id,
          },
        },
        update: {},
        create: {
          productId: products[productName].id,
          modifierId: modifiers[modifierName].id,
        },
      });
    }
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

  const ingredientDefinitions = [
    ["Coffee Beans", "g", 5000, 500, 0.03],
    ["Milk", "ml", 10000, 1000, 0.01],
    ["Sugar", "g", 3000, 500, 0.005],
    ["Tea Leaves", "g", 2000, 300, 0.02],
    ["Chocolate Powder", "g", 2500, 300, 0.015],
    ["Croissant Dough", "pcs", 30, 5, 0.8],
    ["Cheesecake Slice", "pcs", 20, 5, 1.2],
  ] as [string, string, number, number, number][];

  const ingredients: Record<string, { id: number }> = {};
  for (const [
    name,
    unit,
    currentStock,
    minStock,
    costPerUnit,
  ] of ingredientDefinitions) {
    ingredients[name] = await upsertByName("ingredient", name, {
      unit,
      currentStock,
      minStock,
      costPerUnit,
      deletedAt: null,
    });
  }

  const productIngredientMappings = {
    Americano: [["Coffee Beans", 18]],
    Latte: [
      ["Coffee Beans", 18],
      ["Milk", 180],
    ],
    Cappuccino: [
      ["Coffee Beans", 18],
      ["Milk", 140],
    ],
    "Green Tea": [
      ["Tea Leaves", 8],
      ["Sugar", 12],
    ],
    "Chocolate Frappe": [
      ["Chocolate Powder", 30],
      ["Milk", 160],
      ["Sugar", 20],
    ],
    Croissant: [["Croissant Dough", 1]],
    Cheesecake: [["Cheesecake Slice", 1]],
  } as Record<string, [string, number][]>;

  for (const [productName, mappings] of Object.entries(
    productIngredientMappings,
  )) {
    for (const [ingredientName, quantityRequired] of mappings) {
      await prisma.productIngredient.upsert({
        where: {
          productId_ingredientId: {
            productId: products[productName].id,
            ingredientId: ingredients[ingredientName].id,
          },
        },
        update: { quantityRequired },
        create: {
          productId: products[productName].id,
          ingredientId: ingredients[ingredientName].id,
          quantityRequired,
        },
      });
    }
  }

  console.log(
    "Seed completed: roles, admin user, categories, products, modifiers, tables, ingredients.",
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
