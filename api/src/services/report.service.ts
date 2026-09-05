import { prisma } from "../config/prisma.js";
import { toCsv, toCsvBuffer } from "../utils/csv.js";

function toNum(value: unknown): number {
  return Number(value ?? 0);
}

function parseLocalDate(dateString?: string): Date {
  if (!dateString) return new Date();
  if (dateString.includes("T")) return new Date(dateString);
  if (dateString.length === 7) return new Date(`${dateString}-01T00:00:00`);
  return new Date(`${dateString}T00:00:00`);
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayRange(dateInput?: Date | string): { start: Date; end: Date } {
  const date = typeof dateInput === "string" ? parseLocalDate(dateInput) : dateInput || new Date();
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function monthRange(dateInput?: Date | string): { start: Date; end: Date } {
  const date = typeof dateInput === "string" ? parseLocalDate(dateInput) : dateInput || new Date();
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

function yearRange(dateInput?: Date | string): { start: Date; end: Date } {
  const date = typeof dateInput === "string" ? parseLocalDate(dateInput) : dateInput || new Date();
  const start = new Date(date.getFullYear(), 0, 1);
  const end = new Date(date.getFullYear() + 1, 0, 1);
  return { start, end };
}

function rangeForPeriod(
  dateString?: string,
  period = "month",
): { start: Date; end: Date } {
  const date = parseLocalDate(dateString);
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
  const summary = await salesSummary(dayRange(dateString));

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
  const baseDate = parseLocalDate(dateString);
  const range = monthRange(baseDate);
  const summary = await salesSummary(range);
  const daysInMonth = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth() + 1,
    0,
  ).getDate();

  const dailyTotals = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), i + 1);
    return {
      date: formatLocalDate(d),
      total: 0,
    };
  });

  summary.orders.forEach((o) => {
    const day = o.createdAt.getDate() - 1;
    if (dailyTotals[day]) {
      dailyTotals[day].total += toNum(o.totalAmount);
    }
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

  return rows.map((row) => {
    const prod = products.find((p) => p.id === row.productId);
    let categoryName = prod?.category?.name ?? "Uncategorized";
    if (categoryName.toLowerCase() === "inventory") {
      categoryName = "Drink";
    }
    return {
      productId: row.productId,
      productName: prod?.name ?? "Unknown",
      categoryName,
      quantity: row._sum.quantity ?? 0,
      totalSales: toNum(row._sum.totalPrice),
    };
  });
};

function formatLocalDateTime(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

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

  return toCsvBuffer(
    orders.flatMap((order) => {
      const formattedDate = formatLocalDateTime(order.createdAt);
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
            createdAt: formattedDate,
          },
        ];
      }

      return order.items.map((item) => ({
        orderNumber: order.orderNumber,
        table: order.table?.name ?? "Walk-in",
        item: item.product?.name ?? item.product?.nameKm ?? "Unknown",
        category: item.product?.category?.name ?? item.product?.category?.nameKm ?? "Uncategorized",
        quantity: item.quantity,
        status: order.status,
        totalAmount: toNum(item.totalPrice),
        createdAt: formattedDate,
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

export const getPurchaseReportSummary = async (dateString?: string, period = "month") => {
  const range = rangeForPeriod(dateString, period);

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: {
      createdAt: { gte: range.start, lt: range.end },
    },
    include: {
      supplier: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const totalPurchaseCost = purchaseOrders.reduce(
    (sum, po) => sum + toNum(po.totalAmount),
    0,
  );
  const activeSuppliersCount = await prisma.supplier.count({
    where: { isActive: true },
  });

  return {
    totalPurchaseCost,
    orderCount: purchaseOrders.length,
    activeSuppliersCount,
    purchaseOrders: purchaseOrders.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      supplierName: po.supplier?.name ?? "Unknown Supplier",
      itemCount: po.items.length,
      totalAmount: toNum(po.totalAmount),
      status: po.status,
      createdAt: po.createdAt,
    })),
  };
};

export const getPaymentMethodBreakdown = async (dateString?: string, period = "month") => {
  const range = rangeForPeriod(dateString, period);

  const orders = await prisma.order.findMany({
    where: {
      deletedAt: null,
      createdAt: { gte: range.start, lt: range.end },
      status: { not: "cancelled" },
    },
  });

  const breakdownMap: Record<string, { method: string; txns: number; total: number }> = {};
  let grossRevenue = 0;

  orders.forEach((o: any) => {
    const rawMethod = (o.paymentMethod || "aba_khqr").toLowerCase();
    let label = "ABA KHQR (Scan to Pay)";
    let key = "khqr";

    if (rawMethod.includes("cash") || rawMethod.includes("សាច់ប្រាក់")) {
      label = "Cash (សាច់ប្រាក់)";
      key = "cash";
    } else if (rawMethod.includes("card") || rawMethod.includes("credit") || rawMethod.includes("visa")) {
      label = "Credit Card / Other";
      key = "card";
    } else if (rawMethod.includes("wing") || rawMethod.includes("pipay") || rawMethod.includes("bakong")) {
      label = "Other E-Wallet";
      key = "e_wallet";
    }

    if (!breakdownMap[key]) {
      breakdownMap[key] = { method: label, txns: 0, total: 0 };
    }

    const amt = toNum(o.totalAmount);
    breakdownMap[key].txns += 1;
    breakdownMap[key].total += amt;
    grossRevenue += amt;
  });

  const items = Object.values(breakdownMap).map((b) => ({
    ...b,
    percentage: grossRevenue > 0 ? Math.round((b.total / grossRevenue) * 100) : 0,
  }));

  return {
    grossRevenue,
    totalTransactions: orders.length,
    breakdown: items,
  };
};
