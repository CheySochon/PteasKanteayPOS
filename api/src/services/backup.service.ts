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
  { key: "payments", model: "payment" },
  { key: "shifts", model: "shift" },
  { key: "notifications", model: "notification" },
  { key: "auditLogs", model: "auditLog" },
] as const;

const DELETE_ORDER = [
  "auditLog",
  "notification",
  "payment",
  "orderItem",
  "order",
  "stockTransaction",
  "inventory",
  "product",
  "diningTable",
  "category",
  "shift",
  "user",
  "role",
  "appSetting",
] as const;

const RESTORE_ORDER = [
  { key: "roles", model: "role" },
  { key: "users", model: "user" },
  { key: "appSettings", model: "appSetting" },
  { key: "shifts", model: "shift" },
  { key: "categories", model: "category" },
  { key: "diningTables", model: "diningTable" },
  { key: "products", model: "product" },
  { key: "inventories", model: "inventory" },
  { key: "stockTransactions", model: "stockTransaction" },
  { key: "orders", model: "order" },
  { key: "orderItems", model: "orderItem" },
  { key: "payments", model: "payment" },
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
  payment: "Payment",
  shift: "Shift",
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

