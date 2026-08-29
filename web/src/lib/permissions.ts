export type AppRole = "Super Admin" | "Admin" | "Cashier" | "Staff" | "Member";
export type StaffPermissions = Record<string, boolean>;
export type StaffPermissionSettings = {
  [key: string]: unknown;
  defaults?: StaffPermissions;
  users?: Record<string, StaffPermissions>;
};

type UserLike = {
  role?: string | { name?: string } | null;
};

export const DEFAULT_STAFF_PERMISSIONS: StaffPermissions = {
  dashboard: true,
  orders: true,
  invoices: true,
  menu: true,
  inventory: true,
  tables: true,
  reports: false,
  users: false,
  settings: false,
  pos: true,
  kds: true,
};

export const STAFF_PERMISSION_PAGES = [
  { key: "dashboard", label: "Dashboard", href: "/admin" },
  { key: "orders", label: "Orders", href: "/admin/orders" },
  { key: "invoices", label: "Invoices", href: "/admin/invoices" },
  { key: "menu", label: "Menu", href: "/admin/menu" },
  { key: "inventory", label: "Inventory", href: "/admin/inventory" },
  { key: "tables", label: "Tables", href: "/admin/tables" },
  { key: "reports", label: "Reports", href: "/admin/reports" },
  { key: "users", label: "Users", href: "/admin/users" },
  { key: "settings", label: "Settings", href: "/admin/settings" },
  { key: "pos", label: "POS", href: "/pos" },
  { key: "kds", label: "Kitchen Display", href: "/kds" },
] as const;

const routeRoles: { prefix: string; roles: AppRole[]; staffKey?: string }[] = [
  { prefix: "/admin/roles", roles: ["Super Admin", "Admin"] },
  { prefix: "/admin/groups", roles: ["Super Admin", "Admin"] },
  { prefix: "/admin/logs", roles: ["Super Admin", "Admin"] },
  { prefix: "/admin/permissions", roles: ["Super Admin", "Admin"] },
  { prefix: "/admin/users", roles: ["Super Admin", "Admin"] },
  { prefix: "/admin/settings", roles: ["Super Admin", "Admin"] },
  { prefix: "/admin/reports", roles: ["Super Admin", "Admin"] },
  { prefix: "/admin/inventory", roles: ["Super Admin", "Admin"] },
  { prefix: "/admin/menu", roles: ["Super Admin", "Admin"] },
  { prefix: "/admin/tables", roles: ["Super Admin", "Admin"] },
  { prefix: "/admin/profile", roles: ["Super Admin", "Admin", "Cashier", "Staff"] },
  { prefix: "/admin/invoices", roles: ["Super Admin", "Admin", "Cashier", "Staff"], staffKey: "invoices" },
  { prefix: "/admin/orders", roles: ["Super Admin", "Admin", "Cashier", "Staff"], staffKey: "orders" },
  { prefix: "/admin/pos", roles: ["Super Admin", "Admin", "Cashier", "Staff"], staffKey: "pos" },
  { prefix: "/admin/kitchen", roles: ["Super Admin", "Admin", "Cashier", "Staff"], staffKey: "kds" },
  { prefix: "/admin", roles: ["Super Admin", "Admin"] },
  { prefix: "/pos", roles: ["Super Admin", "Admin", "Cashier", "Staff"], staffKey: "pos" },
  { prefix: "/kds", roles: ["Super Admin", "Admin", "Cashier", "Staff"], staffKey: "kds" },
];

export function roleName(user: UserLike | Record<string, any> | null | undefined): string {
  if (!user) return "Member";
  const r = (user as any).roleName || user.role || (user as any).group;
  if (typeof r === "string") {
    const raw = r.trim();
    const lower = raw.toLowerCase();
    if (lower.includes("super admin") || lower.includes("super_admin")) return "Super Admin";
    if (lower.includes("admin")) return "Admin";
    if (lower.includes("cashier") || lower.includes("pos")) return "Cashier";
    if (lower.includes("staff") || lower.includes("kitchen") || lower.includes("kds")) return "Staff";
    return raw;
  }
  if (r && typeof r === "object" && (r as any).name) {
    const nameStr = String((r as any).name).trim();
    const lower = nameStr.toLowerCase();
    if (lower.includes("super admin") || lower.includes("super_admin")) return "Super Admin";
    if (lower.includes("admin")) return "Admin";
    if (lower.includes("cashier") || lower.includes("pos")) return "Cashier";
    if (lower.includes("staff") || lower.includes("kitchen") || lower.includes("kds")) return "Staff";
    return nameStr;
  }
  return "Member";
}

export function parseStoredUser(snapshot: string | null): {
  id?: number;
  name: string;
  email?: string;
  role: string;
  roleName: string;
  group?: string;
  groupId?: number;
  permissions?: string[];
  isActive?: boolean;
} {
  if (!snapshot) return { name: "Guest", role: "Member", roleName: "Member" };

  try {
    const user = JSON.parse(snapshot);
    const rawGroup = user.roleName || user.group || (typeof user.role === "string" ? user.role : user.role?.name) || roleName(user);

    return {
      ...user,
      id: user.id,
      name: user.name || "User",
      email: user.email,
      role: roleName(user),
      roleName: rawGroup,
      group: rawGroup,
      groupId: user.groupId || user.group_id,
      permissions: user.permissions || user.groupPermissions,
      isActive: user.isActive,
    };
  } catch {
    return { name: "User", role: "Member", roleName: "Member" };
  }
}

export function normalizeStaffPermissions(permissions?: any): StaffPermissions {
  if (typeof permissions === "string") {
    try {
      permissions = JSON.parse(permissions);
    } catch {}
  }

  if (!permissions) return { ...DEFAULT_STAFF_PERMISSIONS };

  // Case 1: Array of permissions [{ key: "kds", view: false }, ...]
  if (Array.isArray(permissions)) {
    const result: StaffPermissions = {
      dashboard: false,
      orders: false,
      invoices: false,
      menu: false,
      inventory: false,
      tables: false,
      reports: false,
      users: false,
      settings: false,
      pos: false,
      kds: false,
    };

    permissions.forEach((item: any) => {
      if (typeof item === "string") {
        result[item] = true;
      } else if (item && typeof item === "object" && item.key) {
        result[item.key] = Boolean(item.view);
        result[`${item.key}_view`] = Boolean(item.view);
        result[`${item.key}_edit`] = Boolean(item.edit || item.create);
        result[`${item.key}_delete`] = Boolean(item.delete);
      }
    });
    return result;
  }

  // Case 2: Dictionary object { kds: false, pos: true, ... }
  if (typeof permissions === "object") {
    const result: StaffPermissions = { ...DEFAULT_STAFF_PERMISSIONS };
    Object.entries(permissions).forEach(([key, val]) => {
      result[key] = Boolean(val);
    });
    return result;
  }

  return { ...DEFAULT_STAFF_PERMISSIONS };
}

export function normalizePermissionSettings(settings?: StaffPermissionSettings | Record<string, unknown> | null) {
  const source = (settings || {}) as StaffPermissionSettings;
  const defaults = normalizeStaffPermissions(source.defaults || source);
  const users = Object.entries(source.users || {}).reduce<Record<string, StaffPermissions>>(
    (normalizedUsers, [userId, permissions]) => {
      normalizedUsers[userId] = normalizeStaffPermissions(permissions);
      return normalizedUsers;
    },
    {}
  );

  return {
    ...defaults,
    defaults,
    users,
  };
}

export function serializePermissionSettings(settings?: StaffPermissionSettings | Record<string, unknown> | null) {
  const normalized = normalizePermissionSettings(settings);

  return {
    ...normalized.defaults,
    defaults: normalized.defaults,
    users: normalized.users,
  };
}

export function permissionsForUser(
  userId?: number | string | null,
  settings?: StaffPermissionSettings | Record<string, unknown> | null
) {
  const normalized = normalizePermissionSettings(settings);
  if (!userId) return normalized.defaults;

  return normalized.users[String(userId)] || normalized.defaults;
}

export function isAdminRole(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.trim().toLowerCase();
  return (
    r === "admin" ||
    r === "super admin" ||
    r === "administrator" ||
    r === "super_admin" ||
    r.includes("admin") ||
    r.includes("super") ||
    r.includes("administrator")
  );
}

export function pathFeatureModule(pathname: string): string {
  if (pathname.startsWith("/admin/menu")) return "menu";
  if (pathname.startsWith("/admin/inventory")) return "inventory";
  if (pathname.startsWith("/admin/reports")) return "reports";
  if (pathname.startsWith("/admin/users") || pathname.startsWith("/admin/groups") || pathname.startsWith("/admin/roles") || pathname.startsWith("/admin/logs") || pathname.startsWith("/admin/permissions")) return "auth";
  if (pathname.startsWith("/admin/settings")) return "settings";
  if (pathname.startsWith("/admin/orders") || pathname.startsWith("/admin/invoices")) return "orders";
  if (pathname.startsWith("/admin/tables")) return "tables";
  if (pathname.startsWith("/admin/kitchen") || pathname.startsWith("/kds")) return "kitchen";
  if (pathname.startsWith("/pos") || pathname.startsWith("/admin/pos")) return "pos";
  if (pathname === "/admin" || pathname.startsWith("/admin/dashboard")) return "dashboard";
  return "";
}

export function canAccessPath(pathname: string, userOrRole: any, staffPermissions?: StaffPermissions | null) {
  let user: any = null;
  if (userOrRole && typeof userOrRole === "object") {
    user = userOrRole;
  } else if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("pos_user");
      if (stored) user = JSON.parse(stored);
    } catch {}
  }

  if (!user) return false;

  // Root Super Admin (ID 1 / owner email) has 100% full access
  const isRootOwner = user.id === 1 || (user.email && user.email.toLowerCase() === "cheychon258@gmail.com");
  if (isRootOwner) return true;

  // Account Profile page is accessible for any authenticated user
  if (pathname.startsWith("/admin/profile")) return true;

  // Dynamic feature module mapping
  const featureModule = pathFeatureModule(pathname);
  if (!featureModule || featureModule === "dashboard") {
    if (hasFeaturePermission(user, "dashboard", "view")) return true;
    if (user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
      const adminPerms = ["pos.users.manage", "pos.settings.manage", "pos.menu.manage", "pos.reports.view", "inventory.manage"];
      if (adminPerms.some((p) => user.permissions.includes(p))) return true;
    }
    const role = roleName(user);
    return isAdminRole(role);
  }

  // 🛡️ 100% Dynamic DB Permission Check
  return hasFeaturePermission(user, featureModule, "view");
}

export function canSeeHref(href: string, userOrRole: any, staffPermissions?: StaffPermissions | null) {
  return canAccessPath(href, userOrRole, staffPermissions);
}

export function fallbackPathForRole(userOrRole: any, staffPermissions?: StaffPermissions | null) {
  return firstAllowedPathForRole(userOrRole, staffPermissions);
}

export function firstAllowedPathForRole(userOrRole: any, staffPermissions?: StaffPermissions | null) {
  let user: any = null;
  if (userOrRole && typeof userOrRole === "object") {
    user = userOrRole;
  } else if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("pos_user");
      if (stored) user = JSON.parse(stored);
    } catch {}
  }

  if (user) {
    const isRootOwner = user.id === 1 || (user.email && user.email.toLowerCase() === "cheychon258@gmail.com");
    if (isRootOwner) return "/admin";
  }

  const allowedPage = STAFF_PERMISSION_PAGES.find((page) => {
    const mod = pathFeatureModule(page.href);
    if (user && mod) {
      return hasFeaturePermission(user, mod, "view");
    }
    return canAccessPath(page.href, userOrRole, staffPermissions);
  });

  if (allowedPage) return allowedPage.href;
  return "/pos";
}

/**
 * Dynamic Feature Permission Checker
 * Checks granular permissions (view, edit, delete) directly from user object or stored permissions
 */
export function hasFeaturePermission(
  user: any,
  featureKey: string,
  action: "view" | "add" | "edit" | "delete" = "view"
): boolean {
  if (!user) return false;

  const rawRoleStr = String(
    user.roleName || user.group || (typeof user.role === "string" ? user.role : user.role?.name) || ""
  ).trim();
  const lowerRole = rawRoleStr.toLowerCase();

  // Root Super Admin (ID 1 / Super Admin role / owner email) has 100% full access
  const isRootOwner =
    user.id === 1 ||
    lowerRole === "super admin" ||
    lowerRole === "super_admin" ||
    (user.email && user.email.toLowerCase() === "cheychon258@gmail.com");

  if (isRootOwner) {
    return true;
  }

  // Helper matching function for specific action and feature key
  const matchActionKey = (perms: string[]): boolean => {
    if (perms.includes(featureKey)) return true;

    // Standard POS RBAC Permission Code Mapping with View, Add, Edit, Delete
    const codeMap: Record<string, string[]> = {
      dashboard: ["dashboard.view", "dashboard.add", "dashboard.edit", "dashboard.delete", "dashboard.manage", "dashboard"],
      pos: ["pos.view", "pos.add", "pos.edit", "pos.delete", "pos.order.create", "pos.payment.process", "pos.discount.apply", "pos"],
      orders: ["orders.view", "orders.add", "orders.edit", "orders.delete", "orders.update", "orders"],
      kitchen: ["kitchen.view", "kitchen.add", "kitchen.edit", "kitchen.delete", "kitchen.manage", "kitchen"],
      tables: ["tables.view", "tables.add", "tables.edit", "tables.delete", "tables.manage", "tables"],
      menu: ["menu.view", "menu.add", "menu.edit", "menu.delete", "pos.menu.manage", "categories.manage", "menu"],
      inventory: ["inventory.view", "inventory.add", "inventory.edit", "inventory.delete", "inventory.manage", "inventory"],
      reports: ["reports.view", "reports.add", "reports.edit", "reports.delete", "pos.reports.view", "reports.export", "reports"],
      auth: ["users.view", "users.add", "users.edit", "users.delete", "pos.users.manage", "audit.view", "users", "groups", "auth"],
      users: ["users.view", "users.add", "users.edit", "users.delete", "pos.users.manage", "users"],
      settings: ["settings.view", "settings.add", "settings.edit", "settings.delete", "pos.settings.manage", "backups.manage", "settings"],
      invoices: ["invoices.view", "invoices.add", "invoices.edit", "invoices.delete", "pos.invoice.void", "invoices"],
    };

    const targetCodes = codeMap[featureKey] || [featureKey];
    if (targetCodes.some((code) => perms.includes(code))) return true;

    if (action === "view") {
      if (perms.includes(`${featureKey}.view`) || perms.includes(`${featureKey}_view`) || perms.includes(`${featureKey}_read`)) return true;
      if (perms.some((k) => k.startsWith(`${featureKey}.`) || k.startsWith(`${featureKey}_`) || k.startsWith(`pos.${featureKey}`))) return true;
    } else if (action === "add") {
      if (perms.includes(`${featureKey}.add`) || perms.includes(`${featureKey}_add`) || perms.includes(`${featureKey}_create`)) return true;
    } else if (action === "edit") {
      if (perms.includes(`${featureKey}.edit`) || perms.includes(`${featureKey}_edit`) || perms.includes(`${featureKey}_update`)) return true;
    } else if (action === "delete") {
      if (perms.includes(`${featureKey}.delete`) || perms.includes(`${featureKey}_delete`) || perms.includes(`${featureKey}_remove`)) return true;
    }
    return false;
  };

  // 1. Check user direct permissions array from database
  if (user.permissions && Array.isArray(user.permissions)) {
    return matchActionKey(user.permissions);
  }

  // 2. Admin accounts default to FULL ACCESS if no explicit group restriction list exists
  const role = roleName(user);
  if (isAdminRole(role) || isAdminRole(rawRoleStr)) {
    return true;
  }

  return false;
}

export function canViewFeature(user: any, featureKey: string): boolean {
  return hasFeaturePermission(user, featureKey, "view");
}

export function canAddFeature(user: any, featureKey: string): boolean {
  return hasFeaturePermission(user, featureKey, "add");
}

export function canEditFeature(user: any, featureKey: string): boolean {
  return hasFeaturePermission(user, featureKey, "edit");
}

export function canDeleteFeature(user: any, featureKey: string): boolean {
  return hasFeaturePermission(user, featureKey, "delete");
}
