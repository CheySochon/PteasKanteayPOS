import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../config/prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_VERSION = 1;
const BACKUP_DIR = path.join(__dirname, "..", "..", "backups");

const TABLES = [
  { key: "users", model: "user" },
  { key: "appSettings", model: "appSetting" },
  { key: "customers", model: "customer" },
  { key: "categories", model: "category" },
  { key: "diningTables", model: "diningTable" },
  { key: "ingredients", model: "ingredient" },
  { key: "products", model: "product" },
  { key: "productVariants", model: "productVariant" },
  { key: "orders", model: "order" },
  { key: "orderItems", model: "orderItem" },
  { key: "payments", model: "payment" },
  { key: "stockMovements", model: "stockMovement" },
  { key: "shifts", model: "shift" },
] as const;

type BackupData = Record<string, unknown[]>;

type Backup = {
  version: number;
  app: string;
  createdAt: string;
  createdBy: { id: string; email: string; role: string } | null;
  data: BackupData;
};

export const createBackup = async (createdBy?: {
  userId: string;
  email?: string;
  role: string;
}): Promise<Backup> => {
  const data: BackupData = {};

  for (const table of TABLES) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data[table.key] = await (prisma as any)[table.model].findMany({
      orderBy: { id: "asc" },
    });
  }

  return {
    version: BACKUP_VERSION,
    app: "pos-newflow",
    createdAt: new Date().toISOString(),
    createdBy: createdBy
      ? { id: createdBy.userId, email: createdBy.email ?? "", role: createdBy.role }
      : null,
    data,
  };
};

export const saveBackupFile = async (
  backup: Backup,
  prefix = "backup",
): Promise<{ filename: string; filePath: string }> => {
  await fs.mkdir(BACKUP_DIR, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${prefix}-${stamp}.json`;
  const filePath = path.join(BACKUP_DIR, filename);

  await fs.writeFile(filePath, JSON.stringify(backup, null, 2), "utf8");

  return { filename, filePath };
};

export const listBackupFiles = async () => {
  try {
    const entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((e) => e.isFile() && e.name.endsWith(".json"))
        .map(async (e) => {
          const filePath = path.join(BACKUP_DIR, e.name);
          const stat = await fs.stat(filePath);
          return {
            filename: e.name,
            size: stat.size,
            createdAt: stat.birthtime,
            updatedAt: stat.mtime,
          };
        }),
    );

    return files.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
};

export const readBackupFile = async (filename: string): Promise<Backup> => {
  const safeName = path.basename(filename ?? "");
  if (!safeName.endsWith(".json")) {
    throw new Error("Invalid backup filename");
  }

  const raw = await fs.readFile(path.join(BACKUP_DIR, safeName), "utf8");
  return JSON.parse(raw) as Backup;
};

export const validateBackup = (backup: unknown): asserts backup is Backup => {
  const b = backup as Partial<Backup>;
  if (!b || typeof b !== "object" || b.app !== "pos-newflow" || !b.data) {
    throw new Error("Invalid backup file");
  }

  for (const table of TABLES) {
    if (!Array.isArray(b.data[table.key])) {
      throw new Error(`Backup is missing ${table.key}`);
    }
  }
};

export const backupSummary = (backup: Backup) => {
  return TABLES.reduce(
    (summary, table) => {
      summary.counts[table.key] = Array.isArray(backup.data?.[table.key])
        ? backup.data[table.key].length
        : 0;
      return summary;
    },
    {
      version: backup.version,
      app: backup.app,
      createdAt: backup.createdAt,
      createdBy: backup.createdBy,
      counts: {} as Record<string, number>,
    },
  );
};
