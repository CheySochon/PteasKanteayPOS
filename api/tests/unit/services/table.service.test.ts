import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    diningTable: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    appSetting: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "../../../src/config/prisma.js";
import {
  listTables,
  createTable,
  updateTable,
  deleteTable,
  getTableByQrToken,
  getQrMenu,
} from "../../../src/services/table.service.js";

const mockTableFindMany = prisma.diningTable.findMany as Mock;
const mockTableFindFirst = prisma.diningTable.findFirst as Mock;
const mockTableCreate = prisma.diningTable.create as Mock;
const mockTableUpdate = prisma.diningTable.update as Mock;

const fakeTable = {
  id: 1,
  name: "T1",
  capacity: 4,
  zone: "indoor",
  qrToken: "table-t1-12345",
  isActive: true,
  deletedAt: null,
};

describe("table.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listTables", () => {
    it("should return non-deleted dining tables", async () => {
      mockTableFindMany.mockResolvedValue([fakeTable]);

      const result = await listTables();

      expect(mockTableFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } })
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("T1");
    });
  });

  describe("createTable", () => {
    it("should create a table with default capacity and zone", async () => {
      mockTableCreate.mockResolvedValue(fakeTable);

      const result = await createTable({ name: "T1" });

      expect(mockTableCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "T1",
            capacity: 2,
            zone: "indoor",
            isActive: true,
          }),
        })
      );
      expect(result.name).toBe("T1");
    });
  });

  describe("updateTable", () => {
    it("should update table details", async () => {
      mockTableUpdate.mockResolvedValue({ ...fakeTable, capacity: 6 });

      const result = await updateTable(1, { capacity: 6 });

      expect(mockTableUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ capacity: 6 }),
        })
      );
      expect(result.capacity).toBe(6);
    });
  });

  describe("deleteTable", () => {
    it("should soft-delete table by setting deletedAt", async () => {
      mockTableUpdate.mockResolvedValue({ ...fakeTable, deletedAt: new Date() });

      await deleteTable(1);

      expect(mockTableUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });
  });

  describe("getTableByQrToken", () => {
    it("should return active table by QR token", async () => {
      mockTableFindFirst.mockResolvedValue(fakeTable);

      const result = await getTableByQrToken("table-t1-12345");

      expect(result.name).toBe("T1");
    });

    it("should throw error if table not found", async () => {
      mockTableFindFirst.mockResolvedValue(null);

      await expect(getTableByQrToken("invalid-token")).rejects.toThrow("Table not found");
    });
  });
});
