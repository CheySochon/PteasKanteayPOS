import "dotenv/config";
import bcrypt from "bcrypt";
import { TableZone } from "@prisma/client";
import { prisma } from "../src/config/prisma.js";

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
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "cheychon258@gmail.com" },
  });

  let superAdmin;
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("password123", 10);
    superAdmin = await prisma.user.create({
      data: {
        name: "CheySochon",
        email: "cheychon258@gmail.com",
        password: hashedPassword,
        isActive: true,
        pin: "0000",
      },
    });
  } else {
    // If user already exists, NEVER overwrite password or pin!
    superAdmin = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        name: existingAdmin.name || "CheySochon",
        isActive: true,
        deletedAt: null,
      },
    });
  }

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

  // 4. Clean initial state for categories and products (Users start with clean empty menu)
  console.log("Seed finished: System ready with Super Admin user and Admin group.");

  // 6. Seed Dining Tables
  const tables = [
    ["T1", 2, "indoor", "table-t-1"],
    ["T2", 2, "indoor", "table-t-2"],
    ["T3", 4, "indoor", "table-t-3"],
    ["T4", 4, "indoor", "table-t-4"],
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
