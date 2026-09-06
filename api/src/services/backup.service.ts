import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../config/prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_VERSION = 1;
const BACKUP_DIR = path.join(__dirname, "..", "..", "backups");

const TABLES = [
  { key: "roles", model: "role" },
  { key: "users", model: "user" },
  { key: "appSettings", model: "appSetting" },
  { key: "categories", model: "category" },
  { key: "diningTables", model: "diningTable" },
  { key: "products", model: "product" },
  { key: "inventories", model: "inventory" },
  { key: "stockTransactions", model: "stockTransaction" },
  { key: "orders", model: "order" },
  { key: "orderItems", model: "orderItem" },
  { key: "notifications", model: "notification" },
  { key: "auditLogs", model: "auditLog" },
] as const;

const DELETE_ORDER = [
  "auditLog",
  "notification",
  "orderItem",
  "order",
  "stockTransaction",
  "inventory",
  "product",
  "diningTable",
  "category",
  "user",
  "role",
  "appSetting",
] as const;

const RESTORE_ORDER = [
  { key: "roles", model: "role" },
  { key: "users", model: "user" },
  { key: "appSettings", model: "appSetting" },
  { key: "categories", model: "category" },
  { key: "diningTables", model: "diningTable" },
  { key: "products", model: "product" },
  { key: "inventories", model: "inventory" },
  { key: "stockTransactions", model: "stockTransaction" },
  { key: "orders", model: "order" },
  { key: "orderItems", model: "orderItem" },
  { key: "notifications", model: "notification" },
  { key: "auditLogs", model: "auditLog" },
] as const;

const DATE_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "deletedAt",
  "paidAt",
  "lockedUntil",
  "startTime",
  "endTime",
  "sentAt",
]);

const DB_TABLE_NAMES: Record<string, string> = {
  role: "Role",
  user: "User",
  appSetting: "AppSetting",
  category: "Category",
  diningTable: "DiningTable",
  product: "Product",
  order: "Order",
  orderItem: "OrderItem",
  notification: "Notification",
  auditLog: "audit_logs",
  inventory: "Inventory",
  stockTransaction: "StockTransaction",
};

function parseDates(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    if (val !== null && val !== undefined && DATE_FIELDS.has(key) && typeof val === "string") {
      result[key] = new Date(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

type BackupData = Record<string, unknown[]>;

export type Backup = {
  version: number;
  app: string;
  createdAt: string;
  createdBy: { id: string; email: string; role: string } | null;
  data: BackupData;
};

export const createBackup = async (createdBy?: {
  userId: number;
  email?: string;
  role: string;
}): Promise<Backup> => {
  const data: BackupData = {};

  for (const table of TABLES) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    data[table.key] = await (prisma as any)[table.model].findMany({
      orderBy: { id: "asc" },
    });
  }

  return {
    version: BACKUP_VERSION,
    app: "pos-newflow",
    createdAt: new Date().toISOString(),
    createdBy: createdBy
      ? { id: String(createdBy.userId), email: createdBy.email ?? "", role: createdBy.role }
      : null,
    data,
  };
};

export const saveBackupFile = async (
  backup: Backup,
  prefix = "pos-backup",
) => {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const filename = `${prefix}-${new Date().toISOString().slice(0, 10)}-${Date.now()}.json`;
  const filePath = path.join(BACKUP_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(backup, null, 2), "utf-8");
  return { filename, filePath };
};

export const listBackupFiles = async () => {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const files = await fs.readdir(BACKUP_DIR);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));

  const items = await Promise.all(
    jsonFiles.map(async (filename) => {
      const filePath = path.join(BACKUP_DIR, filename);
      const stat = await fs.stat(filePath);
      return {
        filename,
        size: stat.size,
        createdAt: stat.birthtime.toISOString(),
      };
    }),
  );

  return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
};

export const readBackupFile = async (filename: string): Promise<Backup> => {
  const safeFilename = path.basename(filename);
  const filePath = path.join(BACKUP_DIR, safeFilename);
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content) as Backup;
};

export const validateBackup = (backup: unknown): void => {
  if (!backup || typeof backup !== "object") {
    throw new Error("Invalid backup payload");
  }

  const b = backup as Backup;

  if (!b.version || !b.app || !b.data) {
    throw new Error("Backup file missing required headers");
  }

  for (const table of TABLES) {
    if (!Array.isArray(b.data[table.key])) {
      throw new Error(`Backup is missing ${table.key}`);
    }
  }
};

export const backupSummary = (backup: Backup) => {
  const counts: Record<string, number> = {};
  for (const table of TABLES) {
    counts[table.key] = Array.isArray(backup.data?.[table.key])
      ? backup.data[table.key].length
      : 0;
  }
  return {
    version: backup.version,
    app: backup.app,
    createdAt: backup.createdAt,
    createdBy: backup.createdBy,
    counts,
  };
};

export const restoreBackupData = async (backup: Backup): Promise<void> => {
  validateBackup(backup);

  await prisma.$transaction(
    async (tx) => {
      // 1. Clear existing data in reverse dependency order
      for (const model of DELETE_ORDER) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (tx as any)[model].deleteMany({});
      }

      // 2. Insert backup records in parent-to-child dependency order
      for (const table of RESTORE_ORDER) {
        const rows = backup.data[table.key] || [];
        for (const row of rows) {
          if (row && typeof row === "object") {
            const parsed = parseDates(row as Record<string, unknown>);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (tx as any)[table.model].create({
              data: parsed,
            });
          }
        }
      }

      // 3. Reset PostgreSQL autoincrement sequences
      for (const [, tableName] of Object.entries(DB_TABLE_NAMES)) {
        try {
          await tx.$executeRawUnsafe(
            `SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), COALESCE((SELECT MAX(id) FROM "${tableName}"), 1));`
          );
        } catch {
          // Ignore table sequence reset errors
        }
      }
    },
    {
      timeout: 60000,
    }
  );
};

export const generateSqlDump = async (): Promise<string> => {
  const backup = await createBackup();
  let sql = `-- POS System Full Database Dump\n`;
  sql += `-- Generated At: ${new Date().toISOString()}\n`;
  sql += `-- Database Target: PostgreSQL / ANSI SQL\n\n`;

  for (const table of RESTORE_ORDER) {
    const dbTableName = DB_TABLE_NAMES[table.model] || table.key;
    const rows = backup.data[table.key] || [];
    if (rows.length === 0) continue;

    sql += `-- Table: "${dbTableName}" (${rows.length} rows)\n`;
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const keys = Object.keys(row);
      const cols = keys.map((k) => `"${k}"`).join(", ");
      const vals = keys
        .map((k) => {
          const v = (row as Record<string, unknown>)[k];
          if (v === null || v === undefined) return "NULL";
          if (typeof v === "number" || typeof v === "boolean") return String(v);
          if (v instanceof Date) return `'${v.toISOString()}'`;
          if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
          return `'${String(v).replace(/'/g, "''")}'`;
        })
        .join(", ");
      sql += `INSERT INTO "${dbTableName}" (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING;\n`;
    }
    sql += `\n`;
  }
  return sql;
};

export const generateBusinessExcel = async (): Promise<Buffer> => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const ExcelJSModule = await import("exceljs");
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  const WorkbookClass = (ExcelJSModule.default || ExcelJSModule).Workbook;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
  const workbook = new WorkbookClass();
  workbook.creator = "POS System";
  workbook.created = new Date();

  const headerFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF55A060" },
  };
  const headerFont = { color: { argb: "FFFFFFFF" }, bold: true, size: 10 };

  // 1. Sales & Orders Sheet
  const ordersSheet = workbook.addWorksheet("Sales & Orders");
  ordersSheet.columns = [
    { header: "Order ID", key: "id", width: 10 },
    { header: "Order Number", key: "orderNumber", width: 18 },
    { header: "Type", key: "type", width: 12 },
    { header: "Table", key: "tableName", width: 15 },
    { header: "Subtotal ($)", key: "subtotal", width: 14 },
    { header: "Tax ($)", key: "tax", width: 12 },
    { header: "Discount ($)", key: "discount", width: 12 },
    { header: "Total Amount ($)", key: "totalAmount", width: 16 },
    { header: "Payment Method", key: "paymentMethod", width: 16 },
    { header: "Status", key: "status", width: 12 },
    { header: "Date & Time", key: "createdAt", width: 22 },
  ];

  const orders = await prisma.order.findMany({
    include: { table: true },
    orderBy: { createdAt: "desc" },
  });

  orders.forEach((o) => {
    ordersSheet.addRow({
      id: o.id,
      orderNumber: o.orderNumber,
      type: o.tableId ? "Dine-In" : "Takeaway",
      tableName: o.table?.name || "-",
      subtotal: Number(o.subtotal || 0).toFixed(2),
      tax: Number(o.taxAmount || 0).toFixed(2),
      discount: Number(o.discountAmount || 0).toFixed(2),
      totalAmount: Number(o.totalAmount || 0).toFixed(2),
      paymentMethod: o.paymentMethod || "Cash",
      status: o.status,
      createdAt: new Date(o.createdAt).toLocaleString("en-GB"),
    });
  });

  // 2. Inventory Stock Sheet
  const stockSheet = workbook.addWorksheet("Inventory Stock");
  stockSheet.columns = [
    { header: "Product ID", key: "id", width: 12 },
    { header: "Product Name", key: "name", width: 25 },
    { header: "Category", key: "category", width: 18 },
    { header: "Current Stock", key: "stock", width: 15 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "Min Stock", key: "minStock", width: 12 },
    { header: "Price ($)", key: "price", width: 12 },
    { header: "Status", key: "status", width: 15 },
  ];

  const products = await prisma.product.findMany({
    include: { category: true, inventory: true },
    orderBy: { id: "asc" },
  });

  products.forEach((p) => {
    const qty = p.trackStock ? Number(p.inventory?.quantity ?? 0) : 999;
    const min = p.trackStock ? Number(p.inventory?.minStock ?? 0) : 0;
    const status = !p.trackStock ? "UNLIMITED" : qty <= 0 ? "OUT OF STOCK" : qty <= min ? "LOW STOCK" : "IN STOCK";
    stockSheet.addRow({
      id: p.id,
      name: p.name,
      category: p.category?.name || "Uncategorized",
      stock: p.trackStock ? qty : "Unlimited",
      unit: p.unit || "pc",
      minStock: p.trackStock ? min : "-",
      price: Number(p.basePrice || 0).toFixed(2),
      status,
    });
  });

  // 3. Staff & Users Sheet
  const userSheet = workbook.addWorksheet("Staff & Users");
  userSheet.columns = [
    { header: "User ID", key: "id", width: 10 },
    { header: "Name", key: "name", width: 22 },
    { header: "Email", key: "email", width: 25 },
    { header: "Role / Group", key: "role", width: 20 },
    { header: "Created Date", key: "createdAt", width: 20 },
  ];

  const users = await prisma.user.findMany({
    include: { userGroups: { include: { group: true } } },
    orderBy: { id: "asc" },
  });

  users.forEach((u) => {
    const userGroups = u.userGroups || [];
    const rolesStr = userGroups.map((ug) => ug.group?.name).filter(Boolean).join(", ") || "Staff";
    userSheet.addRow({
      id: u.id,
      name: u.name,
      email: u.email,
      role: rolesStr,
      createdAt: new Date(u.createdAt).toLocaleString("en-GB"),
    });
  });

  // Format headers and enable Auto-Filters
  ordersSheet.autoFilter = "A1:K1";
  stockSheet.autoFilter = "A1:H1";
  userSheet.autoFilter = "A1:E1";

  [ordersSheet, stockSheet, userSheet].forEach((ws) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const headerRow = (ws as any).getRow(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    headerRow.eachCell((cell: any) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    headerRow.height = 24;
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  const arrayBuffer = (await (workbook as any).xlsx.writeBuffer()) as ArrayBuffer;
  return Buffer.from(arrayBuffer);
};

export const cleanOldAutoBackups = async (retentionDays = 30) => {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const files = await fs.readdir(BACKUP_DIR);
    const now = Date.now();
    const cutoff = retentionDays * 24 * 60 * 60 * 1000;

    for (const filename of files) {
      if (filename.startsWith("auto-backup-")) {
        const filePath = path.join(BACKUP_DIR, filename);
        const stat = await fs.stat(filePath);
        if (now - stat.mtimeMs > cutoff) {
          await fs.unlink(filePath);
        }
      }
    }
  } catch (err) {
    console.error("Failed to clean old auto backups:", err);
  }
};


