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
  { prefix: "/admin/permissions", roles: ["Super Admin", "Admin"] },
  { prefix: "/admin/profile", roles: ["Super Admin", "Admin", "Cashier", "Staff"] },
  { prefix: "/admin/users", roles: ["Super Admin", "Admin", "Cashier", "Staff"], staffKey: "users" },
  { prefix: "/admin/settings", roles: ["Super Admin", "Admin", "Cashier", "Staff"], staffKey: "settings" },
  { prefix: "/admin/reports", roles: ["Super Admin", "Admin", "Cashier", "Staff"], staffKey: "reports" },
  { prefix: "/admin/inventory", roles: ["Super Admin", "Admin", "Cashier", "Staff"], staffKey: "inventory" },
  { prefix: "/admin/menu", roles: ["Super Admin", "Admin", "Cashier", "Staff"], staffKey: "menu" },
  { prefix: "/admin/tables", roles: ["Super Admin", "Admin", "Cashier", "Staff"], staffKey: "tables" },
  { prefix: "/admin/invoices", roles: ["Super Admin", "Admin", "Cashier", "Staff"], staffKey: "invoices" },
  { prefix: "/admin/orders", roles: ["Super Admin", "Admin", "Cashier", "Staff"], staffKey: "orders" },
  { prefix: "/admin", roles: ["Super Admin", "Admin", "Cashier", "Staff"], staffKey: "dashboard" },
  { prefix: "/pos", roles: ["Super Admin", "Admin", "Cashier", "Staff"], staffKey: "pos" },
  { prefix: "/kds", roles: ["Super Admin", "Admin", "Cashier", "Staff"], staffKey: "kds" },
];

export function roleName(user: UserLike | Record<string, any> | null | undefined): string {
  if (!user) return "Member";
  const r = (user as any).roleName || user.role;
  if (typeof r === "string") return r;
  if (r && typeof r === "object" && (r as any).name) return (r as any).name;
  return "Member";
}

export function parseStoredUser(snapshot: string | null): { id?: number; name: string; email?: string; role: string; isActive?: boolean } {
  if (!snapshot) return { name: "Guest", role: "Member" };

  try {
    const user = JSON.parse(snapshot) as {
      id?: number;
      name?: string;
      email?: string;
      role?: string | { name?: string };
      isActive?: boolean;
    };

    return {
      id: user.id,
      name: user.name || "User",
      email: user.email,
      role: roleName(user),
      isActive: user.isActive,
    };
  } catch {
    return { name: "User", role: "Member" };
  }
}

export function normalizeStaffPermissions(permissions?: Record<string, unknown> | null): StaffPermissions {
  const source = permissions || {};

  return Object.keys(DEFAULT_STAFF_PERMISSIONS).reduce<StaffPermissions>((normalized, permissionKey) => {
    normalized[permissionKey] =
      permissionKey in source ? Boolean(source[permissionKey]) : DEFAULT_STAFF_PERMISSIONS[permissionKey];
    return normalized;
  }, {});
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

export function canAccessPath(pathname: string, role: string, staffPermissions?: StaffPermissions | null) {
  const normalizedRole = (role || "").trim().toLowerCase();
  if (["super admin", "admin", "administrator"].includes(normalizedRole)) return true;
  if (normalizedRole === "cashier" && (pathname === "/pos" || pathname.startsWith("/pos/"))) return true;
  if ((normalizedRole === "staff" || normalizedRole === "kitchen") && (pathname === "/kds" || pathname.startsWith("/kds/"))) return true;

  const rule = routeRoles
    .filter((entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];

  if (!rule) return true;

  if (rule.staffKey) {
    const perms = normalizeStaffPermissions(staffPermissions);
    return Boolean(perms[rule.staffKey]);
  }

  return rule.roles.some((r) => r.toLowerCase() === normalizedRole);
}

export function canSeeHref(href: string, role: string, staffPermissions?: StaffPermissions | null) {
  return canAccessPath(href, role, staffPermissions);
}

export function fallbackPathForRole(role: string, staffPermissions?: StaffPermissions | null) {
  const normalizedRole = (role || "").trim().toLowerCase();
  if (["super admin", "admin", "administrator"].includes(normalizedRole)) return "/admin";
  return firstAllowedPathForRole(role, staffPermissions);
}

export function firstAllowedPathForRole(role: string, staffPermissions?: StaffPermissions | null) {
  const normalizedRole = (role || "").trim().toLowerCase();
  if (normalizedRole === "cashier") return "/pos";
  if (normalizedRole === "staff" || normalizedRole === "kitchen") return "/kds";
  if (["super admin", "admin", "administrator"].includes(normalizedRole)) return "/admin";

  const perms = normalizeStaffPermissions(staffPermissions);
  const allowedPage = STAFF_PERMISSION_PAGES.find((page) => perms[page.key] && canAccessPath(page.href, role, perms));

  if (allowedPage) return allowedPage.href;
  return "/pos";
}
