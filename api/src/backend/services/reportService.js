const { prisma } = require('../lib/prisma');
const { toCsv } = require('../utils/csv');

function number(value) {
  return Number(value || 0);
}

function dayRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

function yearRange(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 1);
  const end = new Date(date.getFullYear() + 1, 0, 1);
  return { start, end };
}

function rangeForPeriod(dateString, period = 'month') {
  const date = dateString ? new Date(dateString) : new Date();

  if (period === 'day') return dayRange(date);
  if (period === 'year') return yearRange(date);
  return monthRange(date);
}

async function salesSummary(range) {
  const orders = await prisma.order.findMany({
    where: {
      deletedAt: null,
      createdAt: { gte: range.start, lt: range.end },
      status: { not: 'cancelled' },
    },
    include: { payments: true },
  });

  const totalSales = orders.reduce((sum, order) => sum + number(order.totalAmount), 0);
  const paidTotal = orders.reduce((sum, order) => (
    sum + order.payments
      .filter((payment) => payment.status === 'completed')
      .reduce((paymentSum, payment) => paymentSum + number(payment.amount), 0)
  ), 0);

  return {
    orderCount: orders.length,
    totalSales,
    paidTotal,
    unpaidTotal: Math.max(totalSales - paidTotal, 0),
    orders,
  };
}

async function getDailySales(dateString) {
  const summary = await salesSummary(dayRange(dateString ? new Date(dateString) : new Date()));
  const hourlySales = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    total: 0,
  }));

  summary.orders.forEach((order) => {
    const hour = order.createdAt.getHours();
    hourlySales[hour].total += number(order.totalAmount);
  });

  const { orders, ...totals } = summary;

  return {
    ...totals,
    hourlySales,
  };
}

async function getMonthlySales(dateString) {
  const baseDate = dateString ? new Date(dateString) : new Date();
  const range = monthRange(baseDate);
  const summary = await salesSummary(range);
  const daysInMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
  const dailyTotals = Array.from({ length: daysInMonth }, (_, index) => ({
    date: new Date(baseDate.getFullYear(), baseDate.getMonth(), index + 1).toISOString().slice(0, 10),
    total: 0,
  }));

  summary.orders.forEach((order) => {
    const day = order.createdAt.getDate() - 1;
    dailyTotals[day].total += number(order.totalAmount);
  });

  const { orders, ...totals } = summary;

  return {
    ...totals,
    dailyTotals,
  };
}

async function getTopProducts(limit = 10, dateString, period = 'month') {
  const range = rangeForPeriod(dateString, period);
  const rows = await prisma.orderItem.groupBy({
    by: ['productId'],
    _sum: { quantity: true, totalPrice: true },
    where: {
      order: {
        deletedAt: null,
        createdAt: { gte: range.start, lt: range.end },
        status: { not: 'cancelled' },
      },
    },
    orderBy: { _sum: { quantity: 'desc' } },
    take: Number(limit),
  });

  const products = await prisma.product.findMany({
    where: { id: { in: rows.map((row) => row.productId) } },
    include: { category: true },
  });

  return rows.map((row) => ({
    productId: row.productId,
    productName: products.find((product) => product.id === row.productId)?.name || 'Unknown',
    categoryName: products.find((product) => product.id === row.productId)?.category?.name || 'Uncategorized',
    quantity: row._sum.quantity || 0,
    totalSales: number(row._sum.totalPrice),
  }));
}

async function exportCsv(dateString, period = 'month') {
  const range = dateString ? rangeForPeriod(dateString, period) : null;
  const orders = await prisma.order.findMany({
    where: {
      deletedAt: null,
      ...(range ? { createdAt: { gte: range.start, lt: range.end } } : {}),
    },
    include: { table: true, items: { include: { product: { include: { category: true } } } } },
    orderBy: { createdAt: 'desc' },
  });

  return toCsv(orders.flatMap((order) => {
    if (!order.items.length) {
      return [{
        orderNumber: order.orderNumber,
        table: order.table?.name || 'Walk-in',
        item: '',
        category: '',
        quantity: '',
        status: order.status,
        totalAmount: number(order.totalAmount),
        createdAt: order.createdAt.toISOString(),
      }];
    }

    return order.items.map((item) => ({
      orderNumber: order.orderNumber,
      table: order.table?.name || 'Walk-in',
      item: item.product?.name || 'Unknown',
      category: item.product?.category?.name || 'Uncategorized',
      quantity: item.quantity,
      status: order.status,
      totalAmount: number(item.totalPrice),
      createdAt: order.createdAt.toISOString(),
    }));
  }), [
    { key: 'orderNumber', label: 'Order Number' },
    { key: 'table', label: 'Table' },
    { key: 'item', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'status', label: 'Status' },
    { key: 'totalAmount', label: 'Total Amount' },
    { key: 'createdAt', label: 'Created At' },
  ]);
}

module.exports = { getDailySales, getMonthlySales, getTopProducts, exportCsv };
