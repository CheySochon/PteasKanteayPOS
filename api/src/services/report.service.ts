import { prisma } from "../config/prisma.js";
import { toCsv } from "../utils/csv.js";

function toNum(value: unknown): number {
  return Number(value ?? 0);
}

function dayRange(date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function monthRange(date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

function yearRange(date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), 0, 1);
  const end = new Date(date.getFullYear() + 1, 0, 1);
  return { start, end };
}

function rangeForPeriod(
  dateString?: string,
  period = "month",
): { start: Date; end: Date } {
  const date = dateString ? new Date(dateString) : new Date();
  if (period === "day") return dayRange(date);
  if (period === "year") return yearRange(date);
  return monthRange(date);
}

async function salesSummary(range: { start: Date; end: Date }) {
  const orders = await prisma.order.findMany({
    where: {
      deletedAt: null,
      createdAt: { gte: range.start, lt: range.end },
      status: { not: "cancelled" },
    },
  });

  const totalSales = orders.reduce((sum, o) => sum + toNum(o.totalAmount), 0);
  const paidTotal = orders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + toNum(o.totalAmount), 0);

  return {
    orderCount: orders.length,
    totalSales,
    paidTotal,
    unpaidTotal: Math.max(totalSales - paidTotal, 0),
    orders,
  };
}

export const getDailySales = async (dateString?: string) => {
  const summary = await salesSummary(
    dayRange(dateString ? new Date(dateString) : new Date()),
  );

  const hourlySales = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    total: 0,
  }));

  summary.orders.forEach((o) => {
    const hour = o.createdAt.getHours();
    hourlySales[hour].total += toNum(o.totalAmount);
  });

  const { orders: _orders, ...totals } = summary;
  return { ...totals, hourlySales };
};

export const getMonthlySales = async (dateString?: string) => {
  const baseDate = dateString ? new Date(dateString) : new Date();
  const range = monthRange(baseDate);
  const summary = await salesSummary(range);
  const daysInMonth = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth() + 1,
    0,
  ).getDate();

  const dailyTotals = Array.from({ length: daysInMonth }, (_, i) => ({
    date: new Date(baseDate.getFullYear(), baseDate.getMonth(), i + 1)
      .toISOString()
      .slice(0, 10),
    total: 0,
  }));

  summary.orders.forEach((o) => {
    const day = o.createdAt.getDate() - 1;
    dailyTotals[day].total += toNum(o.totalAmount);
  });

  const { orders: _orders, ...totals } = summary;
  return { ...totals, dailyTotals };
};

export const getTopProducts = async (
  limit = 10,
  dateString?: string,
  period = "month",
) => {
  const range = rangeForPeriod(dateString, period);
  const rows = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true, totalPrice: true },
    where: {
      order: {
        deletedAt: null,
        createdAt: { gte: range.start, lt: range.end },
        status: { not: "cancelled" },
      },
    },
    orderBy: { _sum: { quantity: "desc" } },
    take: Number(limit),
  });

  const products = await prisma.product.findMany({
    where: { id: { in: rows.map((r) => r.productId) } },
    include: { category: true },
  });

  return rows.map((row) => ({
    productId: row.productId,
    productName:
      products.find((p) => p.id === row.productId)?.name ?? "Unknown",
    categoryName:
      products.find((p) => p.id === row.productId)?.category?.name ??
      "Uncategorized",
    quantity: row._sum.quantity ?? 0,
    totalSales: toNum(row._sum.totalPrice),
  }));
};

export const exportCsv = async (dateString?: string, period = "month") => {
  const range = dateString ? rangeForPeriod(dateString, period) : null;

  const orders = await prisma.order.findMany({
    where: {
      deletedAt: null,
      ...(range ? { createdAt: { gte: range.start, lt: range.end } } : {}),
    },
    include: {
      table: true,
      items: { include: { product: { include: { category: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return toCsv(
    orders.flatMap((order) => {
      if (!order.items.length) {
        return [
          {
            orderNumber: order.orderNumber,
            table: order.table?.name ?? "Walk-in",
            item: "",
            category: "",
            quantity: 0,
            status: order.status,
            totalAmount: toNum(order.totalAmount),
            createdAt: order.createdAt.toISOString(),
          },
        ];
      }

      return order.items.map((item) => ({
        orderNumber: order.orderNumber,
        table: order.table?.name ?? "Walk-in",
        item: item.product?.name ?? "Unknown",
        category: item.product?.category?.name ?? "Uncategorized",
        quantity: item.quantity,
        status: order.status,
        totalAmount: toNum(item.totalPrice),
        createdAt: order.createdAt.toISOString(),
      }));
    }),
    [
      { key: "orderNumber", label: "Order Number" },
      { key: "table", label: "Table" },
      { key: "item", label: "Item" },
      { key: "category", label: "Category" },
      { key: "quantity", label: "Quantity" },
      { key: "status", label: "Status" },
      { key: "totalAmount", label: "Total Amount" },
      { key: "createdAt", label: "Created At" },
    ],
  );
};
