"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import "chart.js/auto";
import type { ChartOptions, TooltipItem } from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import TopBar from "../../components/TopBar";
import type { Language, NotificationItem } from "../../components/TopBar";
import OrderStatusBadge from "../../components/OrderStatusBadge";
import {
  getDailySales,
  getLowStock,
  getOrders,
  getTopProducts,
} from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { useAppTheme } from "../../lib/theme";
import type {
  DailySalesReport,
  Ingredient,
  Order,
  TopProductReport,
} from "../../lib/types";
import { useAutoDismiss } from "../../lib/useAutoDismiss";


const TEXT = {
  en: {
    title: "Admin Dashboard",
    subtitle: "Sales, orders, products, and stock overview.",
    todaySales: "Today Sales",
    paid: "Paid",
    todayOrders: "Today Orders",
    ordersCreatedToday: "Orders created today",
    activeOrders: "Active Orders",
    kitchenQueue: "Kitchen and service queue",
    lowStock: "Low Stock",
    ingredientsNeedAttention: "Ingredients need attention",
    salesAnalytics: "Sales Analytics",
    salesAnalyticsDesc: "Sales amount grouped by order time.",
    orderStatus: "Order Status",
    orderStatusDesc: "Current order distribution.",
    recentOrders: "Recent Orders",
    recentOrdersDesc: "Latest customer orders.",
    shown: "shown",
    order: "Order",
    table: "Table",
    status: "Status",
    total: "Total",
    created: "Created",
    loadingOrders: "Loading orders...",
    noOrders: "No orders yet",
    walkIn: "Walk-in",
    topProducts: "Top Products",
    topProductsDesc: "Best selling products.",
    noProductSales: "No product sales yet",
    sold: "sold",
    allStockGood: "All ingredients are above minimum stock.",
    current: "Current",
    min: "Min",
    newOrders: "New active orders",
    newOrdersDetail: "orders need kitchen or service attention",
    lowStockAlert: "Low stock alert",
    lowStockDetail: "ingredients are below minimum stock",
    newOrderAlert: "New order received",
    newOrderDetail: "needs attention",
  },
  km: {
    title: "ផ្ទាំងគ្រប់គ្រង",
    subtitle: "សេចក្តីសង្ខេបការលក់ ការបញ្ជាទិញ មុខម្ហូប និងស្តុក។",
    todaySales: "ការលក់ថ្ងៃនេះ",
    paid: "បានបង់",
    todayOrders: "ការបញ្ជាទិញថ្ងៃនេះ",
    ordersCreatedToday: "បានបង្កើតថ្ងៃនេះ",
    activeOrders: "ការបញ្ជាទិញសកម្ម",
    kitchenQueue: "ជួរផ្ទះបាយ និងសេវាកម្ម",
    lowStock: "ស្តុកទាប",
    ingredientsNeedAttention: "គ្រឿងផ្សំត្រូវការត្រួតពិនិត្យ",
    salesAnalytics: "វិភាគការលក់",
    salesAnalyticsDesc: "ចំនួនលក់តាមម៉ោងបញ្ជាទិញ។",
    orderStatus: "ស្ថានភាពការបញ្ជាទិញ",
    orderStatusDesc: "ការបែងចែកស្ថានភាពបច្ចុប្បន្ន។",
    recentOrders: "ការបញ្ជាទិញថ្មីៗ",
    recentOrdersDesc: "ការបញ្ជាទិញអតិថិជនចុងក្រោយ។",
    shown: "បានបង្ហាញ",
    order: "លេខបញ្ជា",
    table: "តុ",
    status: "ស្ថានភាព",
    total: "សរុប",
    created: "បានបង្កើត",
    loadingOrders: "កំពុងផ្ទុកការបញ្ជាទិញ...",
    noOrders: "មិនទាន់មានការបញ្ជាទិញ",
    walkIn: "ភ្ញៀវផ្ទាល់",
    topProducts: "មុខម្ហូបលក់ដាច់",
    topProductsDesc: "មុខម្ហូបដែលលក់បានច្រើន។",
    noProductSales: "មិនទាន់មានការលក់មុខម្ហូប",
    sold: "បានលក់",
    allStockGood: "គ្រឿងផ្សំទាំងអស់នៅលើកម្រិតអប្បបរមា។",
    current: "បច្ចុប្បន្ន",
    min: "អប្បបរមា",
    newOrders: "ការបញ្ជាទិញសកម្មថ្មី",
    newOrdersDetail: "ការបញ្ជាទិញត្រូវការផ្ទះបាយ ឬសេវាកម្ម",
    lowStockAlert: "ការជូនដំណឹងស្តុកទាប",
    lowStockDetail: "គ្រឿងផ្សំក្រោមកម្រិតអប្បបរមា",
    newOrderAlert: "ការបញ្ជាទិញថ្មី",
    newOrderDetail: "ត្រូវការការត្រួតពិនិត្យ",
  },
};

function money(value: number | string) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function hourLabel(hour: number | string) {
  const value = Number(hour);
  if (Number.isNaN(value)) return String(hour);
  if (value === 0) return "12 AM";
  if (value === 12) return "12 PM";
  return value > 12 ? `${value - 12} PM` : `${value} AM`;
}

function subscribeToLanguageChanges(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("pos-language-change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("pos-language-change", onStoreChange);
  };
}

function getLanguageSnapshot(): Language {
  return localStorage.getItem("pos_language") === "km" ? "km" : "en";
}

function getServerLanguageSnapshot(): Language {
  return "en";
}

function setDashboardLanguage(language: Language) {
  localStorage.setItem("pos_language", language);
  window.dispatchEvent(new Event("pos-language-change"));
}

const CLEARED_ACTIVE_ORDER_IDS_KEY = "pos_cleared_active_order_ids";

function getClearedActiveOrderIds() {
  if (typeof window === "undefined") return new Set<number>();

  try {
    const ids = JSON.parse(localStorage.getItem(CLEARED_ACTIVE_ORDER_IDS_KEY) || "[]");
    return new Set(
      Array.isArray(ids)
        ? ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
        : []
    );
  } catch {
    return new Set<number>();
  }
}

function saveClearedActiveOrderIds(ids: Set<number>) {
  localStorage.setItem(CLEARED_ACTIVE_ORDER_IDS_KEY, JSON.stringify([...ids]));
}

export default function DashboardPage() {
  const [theme] = useAppTheme();
  const language = useSyncExternalStore(
    subscribeToLanguageChanges,
    getLanguageSnapshot,
    getServerLanguageSnapshot
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [dailySales, setDailySales] = useState<DailySalesReport | null>(null);
  const [lowStock, setLowStock] = useState<Ingredient[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductReport[]>([]);
  const [orderAlerts, setOrderAlerts] = useState<NotificationItem[]>([]);
  const [clearedNotificationIds, setClearedNotificationIds] = useState<Set<string>>(
    () => new Set()
  );
  const [clearedActiveOrderIds, setClearedActiveOrderIds] = useState<Set<number>>(
    getClearedActiveOrderIds
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useAutoDismiss(error, setError);

  const dark = theme === "dark";
  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const softSurface = dark ? "bg-[#232333]" : "bg-[#f5f5f9]";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-[#e5e7eb]";
  const textPrimary = dark ? "text-slate-100" : "text-[#566a7f]";
  const textSecondary = dark ? "text-slate-400" : "text-[#a1acb8]";
  const cardClass = `rounded border ${borderCol} ${surface} shadow-sm`;

  const t = TEXT[language];

  useEffect(() => {
    let mounted = true;

    Promise.all([
      getDailySales(),
      getOrders(),
      getLowStock(),
      getTopProducts(),
    ])
      .then(([sales, orderRows, lowRows, topRows]) => {
        if (!mounted) return;
        setDailySales(sales);
        setOrders(orderRows);
        setLowStock(lowRows);
        setTopProducts(topRows);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handleOrderCreated(order: Order) {
      setClearedActiveOrderIds((current) => {
        if (!current.has(order.id)) return current;

        const next = new Set(current);
        next.delete(order.id);
        saveClearedActiveOrderIds(next);
        return next;
      });

      setOrders((current) => [
        order,
        ...current.filter((entry) => entry.id !== order.id),
      ]);

      setOrderAlerts((current) => {
        const label = order.orderNumber || order.orderId || `#${order.id}`;
        const table = order.table?.name || order.tableNo;
        const detail = table
          ? `${label} - ${table} ${t.newOrderDetail}`
          : `${label} ${t.newOrderDetail}`;

        return [
          {
            id: `order-${order.id}-${Date.now()}`,
            title: t.newOrderAlert,
            detail,
          },
          ...current,
        ].slice(0, 5);
      });
    }

    function handleOrderUpdated(order: Order) {
      setOrders((current) =>
        current.map((entry) => (entry.id === order.id ? order : entry))
      );
    }

    socket.on("order:created", handleOrderCreated);
    socket.on("order:updated", handleOrderUpdated);

    return () => {
      socket.off("order:created", handleOrderCreated);
      socket.off("order:updated", handleOrderUpdated);
    };
  }, [t.newOrderAlert, t.newOrderDetail]);

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order) => !["completed", "cancelled"].includes(order.status)
      ),
    [orders]
  );
  const unseenActiveOrders = useMemo(
    () => activeOrders.filter((order) => !clearedActiveOrderIds.has(order.id)),
    [activeOrders, clearedActiveOrderIds]
  );

  const recentOrders = orders.slice(0, 6);

  const stats = [
    {
      label: t.todaySales,
      value: money(dailySales?.totalSales || 0),
      note: `${t.paid} ${money(dailySales?.paidTotal || 0)}`,
      tone: "green" as const,
    },
    {
      label: t.todayOrders,
      value: String(dailySales?.orderCount || 0),
      note: t.ordersCreatedToday,
      tone: "blue" as const,
    },
    {
      label: t.activeOrders,
      value: String(activeOrders.length),
      note: t.kitchenQueue,
      tone: "orange" as const,
    },
    {
      label: t.lowStock,
      value: String(lowStock.length),
      note: t.ingredientsNeedAttention,
      tone: "red" as const,
    },
  ];

  const notifications = useMemo(() => {
    const items: NotificationItem[] = [...orderAlerts];

    if (unseenActiveOrders.length > 0) {
      items.push({
        id: `active-orders-${unseenActiveOrders.map((order) => order.id).join("-")}`,
        title: t.newOrders,
        detail: `${unseenActiveOrders.length} ${t.newOrdersDetail}`,
      });
    }

    if (lowStock.length > 0) {
      items.push({
        id: `low-stock-${lowStock.length}`,
        title: t.lowStockAlert,
        detail: `${lowStock.length} ${t.lowStockDetail}`,
        tone: "warning" as const,
      });
    }

    return items.filter((item) => !clearedNotificationIds.has(item.id));
  }, [clearedNotificationIds, lowStock.length, orderAlerts, t, unseenActiveOrders]);

  function clearNotifications() {
    setClearedNotificationIds((current) => {
      const next = new Set(current);
      notifications.forEach((item) => next.add(item.id));
      return next;
    });
    setClearedActiveOrderIds((current) => {
      const next = new Set(current);
      activeOrders.forEach((order) => next.add(order.id));
      saveClearedActiveOrderIds(next);
      return next;
    });
    setOrderAlerts([]);
  }

  const orderStatusCount = useMemo(() => {
    return orders.reduce<Record<string, number>>((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});
  }, [orders]);

  const salesByHour = useMemo(() => {
    const rows = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      total: 0,
      count: 0,
    }));

    if (dailySales?.hourlySales?.length) {
      dailySales.hourlySales.forEach((row) => {
        const hour = Number(row.hour);
        if (hour >= 0 && hour < 24) {
          rows[hour].total = Number(row.total || 0);
        }
      });
      return rows;
    }

    orders.forEach((order) => {
      const date = new Date(order.createdAt);
      const hour = date.getHours();
      rows[hour].total += Number(order.totalAmount || 0);
      rows[hour].count += 1;
    });

    return rows;
  }, [dailySales, orders]);

  const peakSalesHour = useMemo(() => {
    return salesByHour.reduce(
      (peak, row) => (row.total > peak.total ? row : peak),
      { hour: 0, total: 0, count: 0 }
    );
  }, [salesByHour]);

  const topProductChartData = {
    labels: topProducts.slice(0, 5).map((item) => item.productName),
    datasets: [
      {
        label: "Sales",
        data: topProducts.slice(0, 5).map((item) => Number(item.totalSales)),
        backgroundColor: "#696cff",
        borderRadius: 4,
        maxBarThickness: 28,
      },
    ],
  };

  const salesTrendChartData = {
    labels: salesByHour.map((item) => hourLabel(item.hour)),
    datasets: [
      {
        label: "Hourly Sales",
        data: salesByHour.map((item) => item.total),
        backgroundColor: salesByHour.map((item) =>
          item.total === peakSalesHour.total && item.total > 0
            ? "#696cff"
            : "rgba(105, 108, 255, 0.35)"
        ),
        borderRadius: 4,
        borderSkipped: false,
        maxBarThickness: 24,
      },
    ],
  };

  const salesChartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"bar">) =>
            `Sales: ${money(context.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: dark ? "#94a3b8" : "#64748b",
          maxRotation: 0,
          autoSkip: true,
          autoSkipPadding: 18,
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: dark ? "#94a3b8" : "#64748b",
          callback: (value: string | number) => money(value),
        },
        grid: {
          color: dark ? "#334155" : "#e2e8f0",
        },
      },
    },
  };

  const orderStatusChartData = {
    labels: Object.keys(orderStatusCount),
    datasets: [
      {
        label: "Orders",
        data: Object.values(orderStatusCount),
        backgroundColor: ["#71dd37", "#696cff", "#ff9f43", "#ff3e1d", "#03c3ec", "#8592a3"],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          boxWidth: 10,
          color: dark ? "#cbd5e1" : "#475569",
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: dark ? "#94a3b8" : "#64748b",
        },
        grid: {
          display: false,
        },
      },
      y: {
        ticks: {
          color: dark ? "#94a3b8" : "#64748b",
        },
        grid: {
          color: dark ? "#334155" : "#e2e8f0",
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          boxWidth: 10,
          color: dark ? "#cbd5e1" : "#475569",
        },
      },
    },
  };

  return (
    <main
        className={`flex-1 overflow-y-auto ${language === "km" ? "font-khmer" : ""}`}
      >
        <TopBar
          title={t.title}
          subtitle={t.subtitle}
          language={language}
          onLanguageChange={setDashboardLanguage}
          notifications={notifications}
          onClearNotifications={clearNotifications}
          dark={dark}
        />

        <div className="mx-auto w-full max-w-[1600px] px-4 py-4 lg:px-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={loading ? "..." : stat.value}
                note={stat.note}
                tone={stat.tone}
                dark={dark}
              />
            ))}
          </section>

          <section className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(420px,0.75fr)]">
            <div className={`min-w-0 ${cardClass} p-4`}>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className={`text-lg font-bold ${textPrimary}`}>
                    {t.salesAnalytics}
                  </h2>
                  <p className={`mt-1 text-sm ${textSecondary}`}>
                    {t.salesAnalyticsDesc}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:min-w-[220px]">
                  <div
                    className={`rounded border px-3 py-2 text-right ${borderCol} ${softSurface}`}
                  >
                    <div
                      className={`text-[10px] font-bold uppercase tracking-wide ${textSecondary}`}
                    >
                      Peak Hour
                    </div>
                    <div className={`text-sm font-bold ${textPrimary}`}>
                      {peakSalesHour.total > 0 ? hourLabel(peakSalesHour.hour) : "-"}
                    </div>
                  </div>

                  <div
                    className={`rounded border px-3 py-2 text-right ${borderCol} ${softSurface}`}
                  >
                    <div
                      className={`text-[10px] font-bold uppercase tracking-wide ${textSecondary}`}
                    >
                      Revenue
                    </div>
                    <div className={`text-sm font-bold ${textPrimary}`}>
                      {money(dailySales?.totalSales || 0)}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`h-[250px] min-w-0 rounded border p-4 ${borderCol} ${softSurface}`}
              >
                <Bar data={salesTrendChartData} options={salesChartOptions} />
              </div>
            </div>

            <div className={`min-w-0 ${cardClass} p-4`}>
              <div className="mb-4">
                <h2 className={`text-lg font-bold ${textPrimary}`}>
                  {t.orderStatus}
                </h2>
                <p className={`mt-1 text-sm ${textSecondary}`}>
                  {t.orderStatusDesc}
                </p>
              </div>

              <div
                className={`h-[250px] min-w-0 rounded border p-4 ${borderCol} ${softSurface}`}
              >
                <Doughnut data={orderStatusChartData} options={doughnutOptions} />
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(380px,420px)]">
            <div className={`min-w-0 overflow-hidden ${cardClass}`}>
              <div className="flex h-14 items-center justify-between border-b px-4 text-sm">
                <div>
                  <h2 className={`text-base font-bold ${textPrimary}`}>
                    {t.recentOrders}
                  </h2>
                  <p className={`hidden text-xs sm:block ${textSecondary}`}>
                    {t.recentOrdersDesc}
                  </p>
                </div>

                <span className={`text-xs font-medium ${textSecondary}`}>
                  {recentOrders.length} {t.shown}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead
                    className="text-[11px] uppercase tracking-wide bg-[#eceef1]/40 text-[#8592a3]"
                  >
                    <tr>
                      <th className="px-4 py-3 font-bold">{t.order}</th>
                      <th className="px-4 py-3 font-bold">{t.table}</th>
                      <th className="px-4 py-3 text-center font-bold">{t.status}</th>
                      <th className="px-4 py-3 font-bold">{t.total}</th>
                      <th className="px-4 py-3 font-bold">{t.created}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className={`py-8 text-center text-xs ${textSecondary}`}
                        >
                          {t.loadingOrders}
                        </td>
                      </tr>
                    ) : recentOrders.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className={`py-8 text-center text-xs ${textSecondary}`}
                        >
                          {t.noOrders}
                        </td>
                      </tr>
                    ) : (
                      recentOrders.map((order) => (
                        <tr
                          key={order.id}
                          className={`border-t ${
                            dark
                              ? "border-[#4e4f6e] hover:bg-[#232333]/60"
                              : "border-[#f0f2f5] hover:bg-[#f5f5f9]"
                          } transition-all duration-150`}
                        >
                          <td className={`px-4 py-3 font-semibold ${textPrimary}`}>
                            {order.orderNumber || order.orderId}
                          </td>

                          <td className={`px-4 py-3 font-medium ${textSecondary}`}>
                            {order.tableNo || order.table?.name || t.walkIn}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <OrderStatusBadge status={order.status} />
                          </td>

                          <td className={`px-4 py-3 font-bold ${textPrimary}`}>
                            {money(order.totalAmount)}
                          </td>

                          <td className={`px-4 py-3 text-xs ${textSecondary}`}>
                            {new Date(order.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className="min-w-0 space-y-4">
              <div className={`${cardClass} p-4`}>
                <div className="mb-4">
                  <h2 className={`text-base font-bold ${textPrimary}`}>
                    {t.topProducts}
                  </h2>
                  <p className={`mt-1 text-sm ${textSecondary}`}>
                    {t.topProductsDesc}
                  </p>
                </div>

                <div
                  className={`mb-4 h-[240px] min-w-0 rounded border p-4 ${borderCol} ${softSurface}`}
                >
                  <Bar data={topProductChartData} options={chartOptions} />
                </div>

                <div className="space-y-2">
                  {topProducts.length === 0 ? (
                    <div className={`text-xs ${textSecondary}`}>
                      {t.noProductSales}
                    </div>
                  ) : (
                    topProducts.slice(0, 5).map((item) => (
                      <div
                        key={item.productId}
                        className={`flex items-center justify-between rounded border ${borderCol} ${softSurface}`}
                      >
                        <div className="min-w-0">
                          <div
                            className={`truncate text-sm font-semibold ${textPrimary}`}
                          >
                            {item.productName}
                          </div>
                          <div className={`text-xs ${textSecondary}`}>
                            {item.quantity} {t.sold}
                          </div>
                        </div>

                        <div className={`text-sm font-bold ${textPrimary}`}>
                          {money(item.totalSales)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div
                className={`rounded border p-4 shadow-sm transition-all duration-150 ${
                  lowStock.length > 0
                    ? "border-[#ff3e1d]/20 bg-[#ffe5e5]/50 text-[#ff3e1d]"
                    : "border-[#71dd37]/20 bg-[#e8fadf]/50 text-[#71dd37]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold">{t.lowStock}</h2>
                    <p className="mt-1 text-sm opacity-90">
                      {lowStock.length === 0
                        ? t.allStockGood
                        : `${lowStock.length} ${t.ingredientsNeedAttention}.`}
                    </p>
                  </div>

                  <span
                    className={`rounded px-2.5 py-0.5 text-xs font-bold ${
                      lowStock.length > 0
                        ? "bg-[#ff3e1d]/10 text-[#ff3e1d]"
                        : "bg-[#71dd37]/10 text-[#71dd37]"
                    }`}
                  >
                    {lowStock.length}
                  </span>
                </div>

                {lowStock.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {lowStock.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        className="rounded bg-white/90 border border-[#e5e7eb]/80 dark:border-[#4e4f6e]/85 dark:bg-[#2b2c40]/90 px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                      >
                        <div className="font-bold">{item.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {t.current}: {item.currentStock} / {t.min}:{" "}
                          {item.minStock}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </section>
        </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  note,
  tone,
  dark,
}: {
  label: string;
  value: string;
  note: string;
  tone: "green" | "blue" | "orange" | "red";
  dark: boolean;
}) {
  const tones = {
    green: "bg-[#e8fadf] text-[#71dd37]",
    blue: "bg-[#e7e7ff] text-[#696cff]",
    orange: "bg-[#fff2e2] text-[#ff9f43]",
    red: "bg-[#ffe5e5] text-[#ff3e1d]",
  };

  return (
    <div
      className={`rounded border p-4 shadow-sm ${
        dark ? "border-[#4e4f6e] bg-[#2b2c40]" : "border-[#e5e7eb] bg-white"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#a1acb8]">{label}</div>
          <div
            className={`mt-1 text-2xl font-bold tracking-tight ${
              dark ? "text-slate-100" : "text-[#566a7f]"
            }`}
          >
            {value}
          </div>
        </div>

        <span className={`rounded px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>
          Live
        </span>
      </div>

      <div className="text-xs font-semibold text-[#8592a3]">{note}</div>
    </div>
  );
}
