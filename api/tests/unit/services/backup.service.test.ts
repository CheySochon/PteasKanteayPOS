import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateBackup,
  backupSummary,
  createBackup,
  restoreBackupData,
  type Backup,
} from "../../../src/services/backup.service.js";

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    role: { findMany: vi.fn().mockResolvedValue([{ id: 1, name: "Admin" }]), deleteMany: vi.fn().mockResolvedValue({ count: 1 }), create: vi.fn() },
    user: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
    appSetting: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
    category: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
    diningTable: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
    product: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
    inventory: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
    stockTransaction: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
    order: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
    orderItem: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
    payment: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
    shift: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
    notification: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
    auditLog: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
    $transaction: vi.fn((fn: any) => fn({
      role: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }), create: vi.fn() },
      user: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
      appSetting: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
      category: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
      diningTable: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
      product: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
      inventory: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
      stockTransaction: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
      order: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
      orderItem: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
      payment: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
      shift: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
      notification: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
      auditLog: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn() },
      $executeRawUnsafe: vi.fn().mockResolvedValue(1),
    })),
  },
}));

describe("backup.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validBackup: Backup = {
    version: 1,
    app: "pos-newflow",
    createdAt: new Date().toISOString(),
    createdBy: { id: "1", email: "admin@pos.local", role: "Admin" },
    data: {
      roles: [{ id: 1, name: "Admin" }],
      users: [],
      appSettings: [],
      categories: [],
      diningTables: [],
      products: [],
      inventories: [],
      stockTransactions: [],
      orders: [],
      orderItems: [],
      payments: [],
      shifts: [],
      notifications: [],
      auditLogs: [],
    },
  };

  it("should validate a proper backup payload", () => {
    expect(() => validateBackup(validBackup)).not.toThrow();
  });

  it("should throw an error for invalid backup payload", () => {
    expect(() => validateBackup(null)).toThrow("Invalid backup payload");
    expect(() => validateBackup({})).toThrow("Backup file missing required headers");
  });

  it("should generate a backup summary with correct counts", () => {
    const summary = backupSummary(validBackup);
    expect(summary.version).toBe(1);
    expect(summary.counts.roles).toBe(1);
    expect(summary.counts.users).toBe(0);
  });

  it("should create a backup object with all 14 tables", async () => {
    const backup = await createBackup({ userId: 1, email: "admin@pos.local", role: "Admin" });
    expect(backup.app).toBe("pos-newflow");
    expect(backup.version).toBe(1);
    expect(backup.data.roles).toBeDefined();
    expect(backup.data.inventories).toBeDefined();
    expect(backup.data.auditLogs).toBeDefined();
  });

  it("should restore backup data without errors", async () => {
    await expect(restoreBackupData(validBackup)).resolves.not.toThrow();
  });
});
