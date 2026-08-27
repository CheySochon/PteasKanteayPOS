import { prisma } from "../config/prisma.js";

export const PERMISSION_MODULE_DEFINITIONS = [
  {
    key: "dashboard",
    label: "Dashboard & Analytics",
    codes: [
      { code: "dashboard.view", name: "View Dashboard" },
      { code: "dashboard.manage", name: "Manage Dashboard Widgets" },
    ],
  },
  {
    key: "pos",
    label: "Point of Sale (POS Terminal)",
    codes: [
      { code: "pos.order.create", name: "Create Order" },
      { code: "pos.payment.process", name: "Process Payment" },
      { code: "pos.invoice.void", name: "Void Invoice / Order" },
      { code: "pos.discount.apply", name: "Apply Discount" },
    ],
  },
  {
    key: "orders",
    label: "Orders Management",
    codes: [
      { code: "orders.view", name: "View Orders" },
      { code: "orders.update", name: "Update Order Status" },
      { code: "orders.delete", name: "Cancel / Delete Order" },
    ],
  },
  {
    key: "kitchen",
    label: "Kitchen Display System (KDS)",
    codes: [
      { code: "kitchen.view", name: "View Kitchen Screen" },
      { code: "kitchen.manage", name: "Update Cooking Status" },
    ],
  },
  {
    key: "tables",
    label: "Tables & Floor Plan",
    codes: [
      { code: "tables.view", name: "View Tables" },
      { code: "tables.manage", name: "Manage Floor Plan & Tables" },
    ],
  },
  {
    key: "menu",
    label: "Menu & Dish Catalog",
    codes: [
      { code: "pos.menu.manage", name: "Manage Menu Catalog" },
      { code: "categories.manage", name: "Manage Categories" },
    ],
  },
  {
    key: "inventory",
    label: "Inventory & Raw Stock",
    codes: [
      { code: "inventory.view", name: "View Inventory" },
      { code: "inventory.manage", name: "Restock & Stock Adjustments" },
    ],
  },
  {
    key: "reports",
    label: "Reports & Analytics",
    codes: [
      { code: "pos.reports.view", name: "View Sales & Analytics Reports" },
      { code: "reports.export", name: "Export Sales Data (CSV)" },
    ],
  },
  {
    key: "auth",
    label: "Auth & Team Management",
    codes: [
      { code: "pos.users.manage", name: "Manage Staff & Groups" },
      { code: "audit.view", name: "View Audit Logs" },
    ],
  },
  {
    key: "settings",
    label: "System Settings",
    codes: [
      { code: "pos.settings.manage", name: "Manage App Settings" },
      { code: "backups.manage", name: "Manage System Backups" },
    ],
  },
];

export const listPermissions = async () => {
  return prisma.permission.findMany({
    orderBy: { code: "asc" },
  });
};

export const getCategorizedPermissions = async () => {
  const allPerms = await prisma.permission.findMany({
    orderBy: { code: "asc" },
  });

  const categoryMap: Record<
    string,
    { key: string; label: string; permissions: any[] }
  > = {};

  for (const moduleDef of PERMISSION_MODULE_DEFINITIONS) {
    categoryMap[moduleDef.key] = {
      key: moduleDef.key,
      label: moduleDef.label,
      permissions: [],
    };
  }

  for (const perm of allPerms) {
    let matchedModule = PERMISSION_MODULE_DEFINITIONS.find((m) =>
      m.codes.some((c) => c.code === perm.code)
    );

    if (!matchedModule) {
      const prefix = perm.code.split(".")[0];
      matchedModule = PERMISSION_MODULE_DEFINITIONS.find((m) => m.key === prefix);
    }

    const targetKey = matchedModule ? matchedModule.key : "pos";
    if (!categoryMap[targetKey]) {
      categoryMap[targetKey] = {
        key: targetKey,
        label: targetKey.toUpperCase(),
        permissions: [],
      };
    }

    categoryMap[targetKey].permissions.push(perm);
  }

  return {
    all: allPerms,
    categorized: Object.values(categoryMap),
  };
};

export const createPermission = async (data: {
  code: string;
  name: string;
  description?: string;
}) => {
  const existing = await prisma.permission.findUnique({
    where: { code: data.code.trim() },
  });

  if (existing) {
    throw new Error("Permission code is already registered");
  }

  return prisma.permission.create({
    data: {
      code: data.code.trim(),
      name: data.name.trim(),
      description: data.description || null,
    },
  });
};
