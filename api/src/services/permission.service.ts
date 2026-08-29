import { prisma } from "../config/prisma.js";

export const PERMISSION_MODULE_DEFINITIONS = [
  {
    key: "dashboard",
    label: "Dashboard & Analytics",
    codes: [
      { code: "dashboard.view", name: "View Dashboard" },
      { code: "dashboard.add", name: "Add Widgets" },
      { code: "dashboard.edit", name: "Edit Dashboard Layout" },
      { code: "dashboard.delete", name: "Delete Widgets" },
    ],
  },
  {
    key: "pos",
    label: "Point of Sale (POS Terminal)",
    codes: [
      { code: "pos.order.create", name: "View POS Terminal & Create Order (Add)" },
      { code: "pos.payment.process", name: "Process Payment & Discounts (Edit)" },
      { code: "pos.invoice.void", name: "Void Invoice / Refund (Delete)" },
    ],
  },
  {
    key: "orders",
    label: "Orders Management",
    codes: [
      { code: "orders.view", name: "View Orders List" },
      { code: "orders.add", name: "Add Manual Order" },
      { code: "orders.edit", name: "Edit / Update Order Status" },
      { code: "orders.delete", name: "Delete / Cancel Order" },
    ],
  },
  {
    key: "kitchen",
    label: "Kitchen Display System (KDS)",
    codes: [
      { code: "kitchen.view", name: "View Kitchen Screen" },
      { code: "kitchen.add", name: "Add Ticket / Dispatch" },
      { code: "kitchen.edit", name: "Edit / Update Cooking Status" },
      { code: "kitchen.delete", name: "Clear / Delete Ticket" },
    ],
  },
  {
    key: "tables",
    label: "Tables & Floor Plan",
    codes: [
      { code: "tables.view", name: "View Tables & Floor Plan" },
      { code: "tables.add", name: "Add Table / Zone" },
      { code: "tables.edit", name: "Edit Table Layout & Status" },
      { code: "tables.delete", name: "Delete Table / Zone" },
    ],
  },
  {
    key: "menu",
    label: "Menu & Dish Catalog",
    codes: [
      { code: "menu.view", name: "View Menu Items & Categories" },
      { code: "menu.add", name: "Add Dish / Category" },
      { code: "menu.edit", name: "Edit Price & Dish Details" },
      { code: "menu.delete", name: "Delete Dish / Category" },
    ],
  },
  {
    key: "inventory",
    label: "Inventory & Stock",
    codes: [
      { code: "inventory.view", name: "View Stock Items" },
      { code: "inventory.add", name: "Add Stock Entry" },
      { code: "inventory.edit", name: "Edit Stock Quantity & Unit" },
      { code: "inventory.delete", name: "Delete Stock Record" },
    ],
  },
  {
    key: "reports",
    label: "Reports & Analytics",
    codes: [
      { code: "reports.view", name: "View Sales & Analytics Reports" },
      { code: "reports.add", name: "Add / Generate Report" },
      { code: "reports.edit", name: "Edit Report Filters" },
      { code: "reports.delete", name: "Delete / Clear Logs" },
    ],
  },
  {
    key: "users",
    label: "Staff & Team Management",
    codes: [
      { code: "users.view", name: "View Staff & Access Groups" },
      { code: "users.add", name: "Add Staff User / Group" },
      { code: "users.edit", name: "Edit Staff User & Permissions" },
      { code: "users.delete", name: "Delete Staff User / Group" },
    ],
  },
  {
    key: "settings",
    label: "System Settings & Backups",
    codes: [
      { code: "settings.view", name: "View System Settings" },
      { code: "settings.add", name: "Add Integration / Config" },
      { code: "settings.edit", name: "Edit System Settings" },
      { code: "settings.delete", name: "Delete Config / Backup" },
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
