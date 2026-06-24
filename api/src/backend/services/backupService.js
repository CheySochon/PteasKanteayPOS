const fs = require('fs/promises');
const path = require('path');
const { prisma } = require('../lib/prisma');

const BACKUP_VERSION = 1;
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

const TABLES = [
  { key: 'roles', model: 'role', dbName: 'Role' },
  { key: 'users', model: 'user', dbName: 'User' },
  { key: 'appSettings', model: 'appSetting', dbName: 'AppSetting' },
  { key: 'customers', model: 'customer', dbName: 'Customer' },
  { key: 'categories', model: 'category', dbName: 'Category' },
  { key: 'diningTables', model: 'diningTable', dbName: 'DiningTable' },
  { key: 'ingredients', model: 'ingredient', dbName: 'Ingredient' },
  { key: 'products', model: 'product', dbName: 'Product' },
  { key: 'productVariants', model: 'productVariant', dbName: 'ProductVariant' },
  { key: 'productModifiers', model: 'productModifier', dbName: 'ProductModifier' },
  { key: 'productModifierMaps', model: 'productModifierMap', dbName: 'ProductModifierMap' },
  { key: 'productIngredients', model: 'productIngredient', dbName: 'ProductIngredient' },
  { key: 'orders', model: 'order', dbName: 'Order' },
  { key: 'orderItems', model: 'orderItem', dbName: 'OrderItem' },
  { key: 'orderItemModifiers', model: 'orderItemModifier', dbName: 'OrderItemModifier' },
  { key: 'payments', model: 'payment', dbName: 'Payment' },
  { key: 'stockMovements', model: 'stockMovement', dbName: 'StockMovement' },
  { key: 'shifts', model: 'shift', dbName: 'Shift' },
  { key: 'notifications', model: 'notification', dbName: 'Notification' },
];

const RESTORE_ORDER = TABLES;
const DELETE_ORDER = [...TABLES].reverse();

async function createBackup(createdBy) {
  const data = {};

  for (const table of TABLES) {
    data[table.key] = await prisma[table.model].findMany({ orderBy: { id: 'asc' } });
  }

  return {
    version: BACKUP_VERSION,
    app: 'posv2',
    createdAt: new Date().toISOString(),
    createdBy: createdBy
      ? {
          id: createdBy.id,
          email: createdBy.email,
          role: createdBy.role,
        }
      : null,
    data,
  };
}

async function saveBackupFile(backup, prefix = 'backup') {
  await fs.mkdir(BACKUP_DIR, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${prefix}-${stamp}.json`;
  const filePath = path.join(BACKUP_DIR, filename);

  await fs.writeFile(filePath, JSON.stringify(backup, null, 2), 'utf8');

  return { filename, filePath };
}

async function listBackupFiles() {
  try {
    const entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map(async (entry) => {
          const filePath = path.join(BACKUP_DIR, entry.name);
          const stat = await fs.stat(filePath);
          return {
            filename: entry.name,
            size: stat.size,
            createdAt: stat.birthtime,
            updatedAt: stat.mtime,
          };
        })
    );

    return files.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function readBackupFile(filename) {
  const safeName = path.basename(filename || '');
  if (!safeName.endsWith('.json')) {
    const err = new Error('Invalid backup filename');
    err.status = 400;
    throw err;
  }

  const raw = await fs.readFile(path.join(BACKUP_DIR, safeName), 'utf8');
  return JSON.parse(raw);
}

async function restoreBackup(backup) {
  validateBackup(backup);

  await prisma.$transaction(
    async (tx) => {
      for (const table of DELETE_ORDER) {
        await tx[table.model].deleteMany({});
      }

      for (const table of RESTORE_ORDER) {
        const rows = normalizeRows(backup.data[table.key] || []);
        if (rows.length > 0) {
          await tx[table.model].createMany({ data: rows });
        }
      }

      for (const table of TABLES) {
        await resetSequence(tx, table.dbName);
      }
    },
    { timeout: 60000 }
  );
}

function validateBackup(backup) {
  if (!backup || typeof backup !== 'object' || backup.app !== 'posv2' || !backup.data) {
    const err = new Error('Invalid backup file');
    err.status = 400;
    throw err;
  }

  for (const table of TABLES) {
    if (!Array.isArray(backup.data[table.key])) {
      const err = new Error(`Backup is missing ${table.key}`);
      err.status = 400;
      throw err;
    }
  }
}

function normalizeRows(rows) {
  return rows.map((row) => {
    const next = { ...row };

    for (const [key, value] of Object.entries(next)) {
      if (value && typeof value === 'string' && /(?:At|Time)$/.test(key)) {
        next[key] = new Date(value);
      }
    }

    return next;
  });
}

async function resetSequence(tx, dbName) {
  await tx.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"${dbName}"', 'id'), COALESCE((SELECT MAX(id) FROM "${dbName}"), 1), (SELECT MAX(id) FROM "${dbName}") IS NOT NULL)`
  );
}

function backupSummary(backup) {
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
      counts: {},
    }
  );
}

module.exports = {
  createBackup,
  saveBackupFile,
  listBackupFiles,
  readBackupFile,
  restoreBackup,
  validateBackup,
  backupSummary,
};
