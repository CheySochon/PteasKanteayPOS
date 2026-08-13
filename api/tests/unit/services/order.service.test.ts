import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    orderItem: {
      create: vi.fn(),
    },
    diningTable: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock OrderStatus enum
vi.mock("../../../src/prisma/client.js", () => ({
  OrderStatus: {
    pending: "pending",
    accepted: "accepted",
    preparing: "preparing",
    ready: "ready",
    served: "served",
    completed: "completed",
    cancelled: "cancelled",
  },
}));

import { prisma } from "../../../src/config/prisma.js";
import {
  formatOrder,
  listOrders,
  getOrder,
  updateOrderStatus,
  deleteOrder,
  addOrderItem,
  splitBill,
} from "../../../src/services/order.service.js";

const mockOrderFindMany = prisma.order.findMany as Mock;
const mockOrderFindFirst = prisma.order.findFirst as Mock;
const mockOrderFindUnique = prisma.order.findUnique as Mock;
const mockOrderCreate = prisma.order.create as Mock;
const mockOrderUpdate = prisma.order.update as Mock;
const mockOrderCount = prisma.order.count as Mock;
const mockProductFindFirst = prisma.product.findFirst as Mock;
const mockOrderItemCreate = prisma.orderItem.create as Mock;
const mockDiningTableFindUnique = prisma.diningTable.findUnique as Mock;

const fakeRawOrder = {
  id: 1,
  orderNumber: "ORD-20260101-0001",
  subtotal: "100.00",
  discountAmount: "10.00",
  taxAmount: "5.00",
  totalAmount: "95.00",
  table: { name: "T1" },
  createdBy: { id: 1, name: "Staff" },
  items: [],
  payments: [],
  deletedAt: null,
  status: "pending",
};

describe("order.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── formatOrder ───────────────────────────────────────────────────────────

  describe("formatOrder", () => {
    it("should return null when given null", () => {
      expect(formatOrder(null)).toBeNull();
    });

    it("should convert decimal strings to numbers and map fields", () => {
      const result = formatOrder(fakeRawOrder);
      expect(result?.orderId).toBe("ORD-20260101-0001");
      expect(result?.tableNo).toBe("T1");
      expect(result?.subtotal).toBe(100);
      expect(result?.discountAmount).toBe(10);
      expect(result?.taxAmount).toBe(5);
      expect(result?.totalAmount).toBe(95);
    });

    it("should set tableNo to null when table is null", () => {
      const result = formatOrder({ ...fakeRawOrder, table: null });
      expect(result?.tableNo).toBeNull();
    });
  });

  // ─── listOrders ────────────────────────────────────────────────────────────

  describe("listOrders", () => {
    it("should return a list of formatted orders", async () => {
      mockOrderFindMany.mockResolvedValue([fakeRawOrder]);

      const result = await listOrders();

      expect(mockOrderFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } })
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.tableNo).toBe("T1");
    });

    it("should filter by status when query.status is provided", async () => {
      mockOrderFindMany.mockResolvedValue([]);

      await listOrders({ status: "pending" });

      expect(mockOrderFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null, status: "pending" } })
      );
    });

    it("should use 'pending' for unknown status values", async () => {
      mockOrderFindMany.mockResolvedValue([]);

      await listOrders({ status: "invalid_status" });

      expect(mockOrderFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null, status: "pending" } })
      );
    });
  });

  // ─── getOrder ──────────────────────────────────────────────────────────────

  describe("getOrder", () => {
    it("should return a formatted order when found", async () => {
      mockOrderFindFirst.mockResolvedValue(fakeRawOrder);

      const result = await getOrder(1);

      expect(result?.orderId).toBe("ORD-20260101-0001");
    });

    it("should throw 'Order not found' when order does not exist", async () => {
      mockOrderFindFirst.mockResolvedValue(null);

      await expect(getOrder(999)).rejects.toThrow("Order not found");
    });
  });

  // ─── updateOrderStatus ─────────────────────────────────────────────────────

  describe("updateOrderStatus", () => {
    it("should update and return the formatted order", async () => {
      mockOrderUpdate.mockResolvedValue({ ...fakeRawOrder, status: "accepted" });

      const result = await updateOrderStatus(1, "accepted");

      expect(mockOrderUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { status: "accepted" },
        })
      );
      expect(result?.subtotal).toBe(100);
    });

    it("should normalize unknown status to 'pending'", async () => {
      mockOrderUpdate.mockResolvedValue(fakeRawOrder);

      await updateOrderStatus(1, "unknown");

      expect(mockOrderUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "pending" } })
      );
    });
  });

  // ─── deleteOrder ───────────────────────────────────────────────────────────

  describe("deleteOrder", () => {
    it("should soft-delete the order by setting deletedAt", async () => {
      mockOrderUpdate.mockResolvedValue({ ...fakeRawOrder, deletedAt: new Date() });

      await deleteOrder(1);

      expect(mockOrderUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });
  });

  // ─── addOrderItem ──────────────────────────────────────────────────────────

  describe("addOrderItem", () => {
    const fakeOrder = { id: 1, orderNumber: "ORD-001" };
    const fakeProduct = { id: 5, basePrice: "20.00", deletedAt: null, isAvailable: true };

    it("should add an item to the order and update totals", async () => {
      mockOrderFindUnique.mockResolvedValue(fakeOrder);
      mockProductFindFirst.mockResolvedValue(fakeProduct);
      mockOrderItemCreate.mockResolvedValue({});
      mockOrderUpdate.mockResolvedValue(fakeRawOrder);

      await addOrderItem(1, { productId: 5, quantity: 2 });

      expect(mockOrderItemCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 1,
            productId: 5,
            quantity: 2,
            unitPrice: 20,
            totalPrice: 40,
          }),
        })
      );
      expect(mockOrderUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: { increment: 40 },
            totalAmount: { increment: 40 },
          }),
        })
      );
    });

    it("should throw if order is not found", async () => {
      mockOrderFindUnique.mockResolvedValue(null);

      await expect(addOrderItem(999, { productId: 5 })).rejects.toThrow("Order not found");
    });

    it("should throw if product is not found or unavailable", async () => {
      mockOrderFindUnique.mockResolvedValue(fakeOrder);
      mockProductFindFirst.mockResolvedValue(null);

      await expect(addOrderItem(1, { productId: 999 })).rejects.toThrow("Product not found: 999");
    });
  });

  // ─── splitBill ─────────────────────────────────────────────────────────────

  describe("splitBill", () => {
    it("should return split data when amounts match the order total", async () => {
      mockOrderFindFirst.mockResolvedValue(fakeRawOrder);

      const splits = [{ label: "Person A", amount: 50 }, { label: "Person B", amount: 45 }];
      const result = await splitBill(1, splits);

      expect(result.orderId).toBe(1);
      expect(result.splits).toEqual(splits);
    });

    it("should throw if split total does not match order total", async () => {
      mockOrderFindFirst.mockResolvedValue(fakeRawOrder);

      const splits = [{ amount: 50 }, { amount: 30 }]; // total = 80, order total = 95

      await expect(splitBill(1, splits)).rejects.toThrow("Split total must equal order total");
    });
  });
});
