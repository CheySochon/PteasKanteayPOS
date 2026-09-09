import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient, TableZone } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(value: string) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  console.log("Seeding RBAC Permissions and Groups...");

  // 1. Seed standard POS permissions
  const standardPermissions = [
    { code: "pos.order.create", name: "Create Order", description: "Allows creating new orders in POS" },
    { code: "pos.payment.process", name: "Process Payment", description: "Allows processing payments for orders" },
    { code: "pos.invoice.void", name: "Void Invoice", description: "Allows voiding invoices or completed orders" },
    { code: "pos.discount.apply", name: "Apply Discount", description: "Allows applying discounts to orders" },
    { code: "pos.reports.view", name: "View Reports", description: "Allows viewing sales and analytics reports" },
    { code: "pos.menu.manage", name: "Manage Menu Catalog", description: "Allows managing products and categories" },
    { code: "pos.settings.manage", name: "Manage System Settings", description: "Allows updating system settings" },
    { code: "pos.users.manage", name: "Manage Staff & Groups", description: "Allows managing staff accounts and access groups" },
  ];

  const permissionsMap: Record<string, { id: number; code: string }> = {};

  for (const perm of standardPermissions) {
    const existing = await prisma.permission.findUnique({ where: { code: perm.code } });
    if (existing) {
      permissionsMap[perm.code] = await prisma.permission.update({
        where: { id: existing.id },
        data: { name: perm.name, description: perm.description },
      });
    } else {
      permissionsMap[perm.code] = await prisma.permission.create({
        data: perm,
      });
    }
  }

  // 2. Seed standard groups with ID 1 explicitly assigned to Admin (Super Admin Group)
  const standardGroups = [
    {
      id: 1,
      name: "Admin",
      description: "Full system administration & configuration access (Super Admin)",
      permissionCodes: [
        "pos.order.create",
        "pos.payment.process",
        "pos.invoice.void",
        "pos.discount.apply",
        "pos.reports.view",
        "pos.menu.manage",
        "pos.settings.manage",
        "pos.users.manage",
      ],
    },
    {
      id: 2,
      name: "Store Manager",
      description: "Store management with reports and catalog rights",
      permissionCodes: [
        "pos.order.create",
        "pos.payment.process",
        "pos.discount.apply",
        "pos.invoice.void",
        "pos.reports.view",
        "pos.menu.manage",
      ],
    },
    {
      id: 3,
      name: "Supervisor",
      description: "Shift supervisor with order & discount void rights",
      permissionCodes: ["pos.order.create", "pos.payment.process", "pos.discount.apply", "pos.invoice.void"],
    },
    {
      id: 4,
      name: "Cashier",
      description: "Front-of-house cashier operations team",
      permissionCodes: ["pos.order.create", "pos.payment.process"],
    },
  ];

  const groupsMap: Record<string, { id: number; name: string }> = {};

  for (const g of standardGroups) {
    let groupRecord = await prisma.group.findUnique({ where: { name: g.name } });
    if (groupRecord) {
      groupRecord = await prisma.group.update({
        where: { id: groupRecord.id },
        data: { description: g.description },
      });
    } else {
      groupRecord = await prisma.group.create({
        data: { id: g.id, name: g.name, description: g.description },
      });
    }
    groupsMap[g.name] = groupRecord;

    // Attach permissions to group
    for (const code of g.permissionCodes) {
      const perm = permissionsMap[code];
      if (perm) {
        await prisma.groupPermission.upsert({
          where: {
            groupId_permissionId: {
              groupId: groupRecord.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            groupId: groupRecord.id,
            permissionId: perm.id,
          },
        });
      }
    }
  }

  // 3. Seed Default Users & Map to Groups
  const hashedPassword = await bcrypt.hash("password123", 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: "cheychon258@gmail.com" },
    update: {
      name: "Super Admin",
      password: hashedPassword,
      isActive: true,
      pin: "0000",
      deletedAt: null,
    },
    create: {
      name: "Super Admin",
      email: "cheychon258@gmail.com",
      password: hashedPassword,
      isActive: true,
      pin: "0000",
    },
  });

  const cashierUser = await prisma.user.upsert({
    where: { email: "cashier@pos.local" },
    update: {
      name: "Cashier User",
      password: hashedPassword,
      isActive: true,
      pin: "1234",
      deletedAt: null,
    },
    create: {
      name: "Cashier User",
      email: "cashier@pos.local",
      password: hashedPassword,
      isActive: true,
      pin: "1234",
    },
  });

  // Explicitly Assign Super Admin (cheychon258@gmail.com) to Group ID 1 ("Admin")
  await prisma.userGroup.upsert({
    where: {
      userId_groupId: {
        userId: superAdmin.id,
        groupId: 1,
      },
    },
    update: {},
    create: {
      userId: superAdmin.id,
      groupId: 1,
    },
  });

  // Assign Cashier User to Cashier group (ID 4)
  await prisma.userGroup.upsert({
    where: {
      userId_groupId: {
        userId: cashierUser.id,
        groupId: groupsMap["Cashier"].id,
      },
    },
    update: {},
    create: {
      userId: cashierUser.id,
      groupId: groupsMap["Cashier"].id,
    },
  });

  // 4. Seed Product Categories
  const categories: Record<string, { id: number; name: string }> = {};
  for (const name of ["Coffee", "Tea", "Frappe", "Food", "Dessert"]) {
    categories[name] = await prisma.category.upsert({
      where: { slug: slugify(name) },
      update: { name, deletedAt: null },
      create: { name, slug: slugify(name) },
    });
  }

  // 5. Seed Products
  const productDefinitions = [
    { category: "Coffee", name: "Americano", description: "Espresso with hot water.", price: 2.0 },
    { category: "Coffee", name: "Latte", description: "Espresso with steamed milk.", price: 2.5 },
    { category: "Coffee", name: "Cappuccino", description: "Espresso, milk, and foam.", price: 2.5 },
    { category: "Tea", name: "Green Tea", description: "Fresh brewed green tea.", price: 2.75 },
    { category: "Frappe", name: "Chocolate Frappe", description: "Iced blended chocolate drink.", price: 3.5 },
    { category: "Food", name: "Croissant", description: "Buttery baked croissant.", price: 2.25 },
    { category: "Dessert", name: "Cheesecake", description: "Classic cheesecake slice.", price: 3.25 },
  ];

  for (const definition of productDefinitions) {
    const slug = slugify(definition.name);
    const basePrice = definition.price;
    await prisma.product.upsert({
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
  }

  // 6. Seed Dining Tables
  const tables = [
    ["T1", 2, "indoor", "table-t-1"],
    ["T2", 2, "indoor", "table-t-2"],
    ["T3", 4, "indoor", "table-t-3"],
    ["T4", 4, "outdoor", "table-t-4"],
  ] as [string, number, TableZone, string][];

  for (const [name, capacity, zone, qrToken] of tables) {
    await prisma.diningTable.upsert({
      where: { name },
      update: { capacity, zone, qrToken, isActive: true, deletedAt: null },
      create: { name, capacity, zone, qrToken, isActive: true },
    });
  }

  console.log(
    "Seed completed: Group ID 1 set to Admin (Super Admin), User cheychon258@gmail.com assigned to Group ID 1.",
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
