"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import "chart.js/auto";
import type { ChartOptions, TooltipItem } from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import TopBar from "../../components/TopBar";
import type { Language, NotificationItem } from "../../components/TopBar";
import OrderStatusBadge from "../../components/OrderStatusBadge";
import {
  getDailySales,
  getOrders,
  getTopProducts,
} from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { useAppTheme } from "../../lib/theme";
import type {
  DailySalesReport,
  Order,
  TopProductReport,
} from "../../lib/types";
import { useAutoDismiss } from "../../lib/useAutoDismiss";

function formatShortOrderNo(order: Order) {
  const raw = order.orderNumber || order.orderId || `#${order.id}`;
  if (typeof raw === "string" && raw.startsWith("ORD-")) {
    const parts = raw.split("-");
    return `#${parts[parts.length - 1]}`;
  }
  return raw;
}

function formatRecentOrderTime(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "--";
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" }) + ", " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}


const TEXT = {
  en: {
    title: "Admin Dashboard",
    subtitle: "Sales, orders, and products overview.",
    todaySales: "Today Sales",
    paid: "Paid",
    todayOrders: "Today Orders",
    ordersCreatedToday: "Orders created today",
    activeOrders: "Active Orders",
    kitchenQueue: "Kitchen and service queue",
    completedOrders: "Completed Orders",
    ordersCompleted: "Orders completed",
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
    subtitle: "សេចក្តីសង្ខេបការលក់ ការបញ្ជាទិញ និងមុខម្ហូប។",
    todaySales: "ការលក់ថ្ងៃនេះ",
    paid: "បានបង់",
    todayOrders: "ការបញ្ជាទិញថ្ងៃនេះ",
    ordersCreatedToday: "បានបង្កើតថ្ងៃនេះ",
    activeOrders: "ការបញ្ជាទិញសកម្ម",
    kitchenQueue: "ជួរផ្ទះបាយ និងសេវាកម្ម",
    completedOrders: "ការបញ្ជាទិញបានបញ្ចប់",
    ordersCompleted: "បានបញ្ចប់រួចរាល់",
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
  const softSurface = dark ? "bg-[#232333]" : "bg-[#f8fafc]";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-slate-200/80";
  const textPrimary = dark ? "text-slate-100" : "text-[#2c3e50]";
  const textSecondary = dark ? "text-slate-400" : "text-[#64748b]";
  const cardClass = `rounded-xl border ${borderCol} ${surface} shadow-sm transition-shadow hover:shadow-md`;

  const t = TEXT[language];

  useEffect(() => {
    let mounted = true;

    Promise.all([
      getDailySales(),
      getOrders(),
      getTopProducts(),
    ])
      .then(([sales, orderRows, topRows]) => {
        if (!mounted) return;
        setDailySales(sales);
        setOrders(orderRows);
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
  
  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);

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

  const hourlySalesTotals = salesByHour.map((h) => h.total);
  const hourlyOrderCounts = salesByHour.map((h) => h.count);

  const stats = [
    {
      label: t.todaySales,
      value: money(dailySales?.totalSales || 0),
      note: `${t.paid} ${money(dailySales?.paidTotal || 0)}`,
      tone: "green" as const,
      sparklineData: hourlySalesTotals,
      sparklineColor: "#71dd37",
    },
    {
      label: t.todayOrders,
      value: String(dailySales?.orderCount || 0),
      note: t.ordersCreatedToday,
      tone: "blue" as const,
      sparklineData: hourlyOrderCounts,
      sparklineColor: "#696cff",
    },
    {
      label: t.activeOrders,
      value: String(activeOrders.length),
      note: t.kitchenQueue,
      tone: "orange" as const,
      sparklineData: hourlyOrderCounts,
      sparklineColor: "#ff9f43",
    },
    {
      label: t.completedOrders,
      value: String(orders.filter((order) => order.status === "completed").length),
      note: t.ordersCompleted,
      tone: "green" as const,
      sparklineData: hourlyOrderCounts,
      sparklineColor: "#03c3ec",
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

    return items.filter((item) => !clearedNotificationIds.has(item.id));
  }, [clearedNotificationIds, orderAlerts, t, unseenActiveOrders]);

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

  const topProductChartData = {
    labels: topProducts.slice(0, 5).map((item) => item.productName),
    datasets: [
      {
        label: "Sales",
        data: topProducts.slice(0, 5).map((item) => Number(item.totalSales)),
        borderColor: "#696cff",
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 9,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: "#696cff",
        pointBorderWidth: 4,
        pointHoverBackgroundColor: "#ffffff",
        pointHoverBorderColor: "#696cff",
        pointHoverBorderWidth: 5,
        backgroundColor: (context: { chart: { ctx: CanvasRenderingContext2D } }) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, dark ? "rgba(105, 108, 255, 0.45)" : "rgba(105, 108, 255, 0.3)");
          gradient.addColorStop(0.7, dark ? "rgba(105, 108, 255, 0.08)" : "rgba(105, 108, 255, 0.04)");
          gradient.addColorStop(1, "rgba(105, 108, 255, 0)");
          return gradient;
        },
      },
    ],
  };

  const salesTrendChartData = {
    labels: salesByHour.map((item) => hourLabel(item.hour)),
    datasets: [
      {
        label: "Revenue ($)",
        data: salesByHour.map((item) => item.total),
        yAxisID: "y",
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        borderColor: "#696cff",
        pointRadius: salesByHour.map((item) => (item.total === peakSalesHour.total && item.total > 0 ? 5 : 2)),
        pointHoverRadius: 7,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: "#696cff",
        pointBorderWidth: 3,
        pointHoverBackgroundColor: "#696cff",
        pointHoverBorderColor: "#ffffff",
        pointHoverBorderWidth: 3,
        backgroundColor: (context: { chart: { ctx: CanvasRenderingContext2D } }) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 220);
          gradient.addColorStop(0, dark ? "rgba(105, 108, 255, 0.45)" : "rgba(105, 108, 255, 0.3)");
          gradient.addColorStop(0.7, dark ? "rgba(105, 108, 255, 0.08)" : "rgba(105, 108, 255, 0.04)");
          gradient.addColorStop(1, "rgba(105, 108, 255, 0)");
          return gradient;
        },
      },
      {
        label: "Orders (Count)",
        data: salesByHour.map((item) => item.count),
        yAxisID: "y1",
        fill: false,
        tension: 0.4,
        borderWidth: 2,
        borderDash: [5, 5],
        borderColor: "#03c3ec",
        pointRadius: 2,
        pointHoverRadius: 6,
        pointBackgroundColor: "#03c3ec",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointHoverBackgroundColor: "#03c3ec",
        pointHoverBorderColor: "#ffffff",
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const commonTooltip = {
    backgroundColor: dark ? "#2b2c40" : "#ffffff",
    titleColor: dark ? "#ffffff" : "#1e293b",
    bodyColor: dark ? "#a1acb8" : "#475569",
    borderColor: dark ? "#4e4f6e" : "#e2e8f0",
    borderWidth: 1,
    padding: 12,
    boxPadding: 6,
    usePointStyle: true,
  };

  const salesChartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
        align: "end" as const,
        labels: {
          boxWidth: 10,
          boxHeight: 8,
          usePointStyle: true,
          pointStyle: "circle",
          color: dark ? "#cbd5e1" : "#334155",
          font: { family: "'Public Sans', sans-serif", size: 12 },
          padding: 15,
        },
      },
      tooltip: {
        ...commonTooltip,
        callbacks: {
          title: (items: TooltipItem<"line">[]) => `Time: ${items[0]?.label || ""}`,
          label: (context: TooltipItem<"line">) => {
            if (context.datasetIndex === 0) {
              return ` Revenue: ${money(context.parsed.y ?? 0)}`;
            }
            return ` Orders: ${context.parsed.y ?? 0} orders`;
          },
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
          font: { family: "'Public Sans', sans-serif", size: 11 }
        },
        grid: {
          display: false,
        },
        border: { display: false }
      },
      y: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        beginAtZero: true,
        ticks: {
          color: dark ? "#94a3b8" : "#64748b",
          callback: (value: string | number) => money(value),
          font: { family: "'Public Sans', sans-serif", size: 11 },
          padding: 8,
        },
        grid: {
          color: dark ? "rgba(255, 255, 255, 0.05)" : "rgba(226, 232, 240, 0.8)",
          drawTicks: false,
        },
        border: { display: false }
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        beginAtZero: true,
        ticks: {
          color: "#03c3ec",
          precision: 0,
          callback: (value: string | number) => `${value}`,
          font: { family: "'Public Sans', sans-serif", size: 11 },
          padding: 8,
        },
        grid: {
          display: false,
        },
        border: { display: false }
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
        borderWidth: 2,
        borderColor: dark ? "#2b2c40" : "#ffffff",
        hoverOffset: 4,
      },
    ],
  };

  const topProductChartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: commonTooltip,
    },
    scales: {
      x: {
        ticks: {
          color: dark ? "#94a3b8" : "#64748b",
          font: { family: "'Public Sans', sans-serif", size: 10 }
        },
        grid: {
          display: false,
        },
        border: { display: false }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: dark ? "#94a3b8" : "#a1acb8",
          font: { family: "'Public Sans', sans-serif", size: 10 }
        },
        grid: {
          color: dark ? "rgba(255, 255, 255, 0.05)" : "rgba(226, 232, 240, 0.8)",
          drawTicks: false,
        },
        border: { display: false }
      },
    },
  };

  const doughnutOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          boxWidth: 10,
          color: dark ? "#cbd5e1" : "#475569",
          font: { family: "'Public Sans', sans-serif" },
          padding: 20
        },
      },
      tooltip: commonTooltip,
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
          <div className="animate-[dashboardPageIn_520ms_cubic-bezier(0.16,1,0.3,1)_both]">
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
                sparklineData={stat.sparklineData}
                sparklineColor={stat.sparklineColor}
              />
            ))}
          </section>

          <section className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(420px,0.75fr)]">
            <div className={`min-w-0 ${cardClass} p-5 rounded-2xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)]`}>
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
                <Line data={salesTrendChartData} options={salesChartOptions} />
              </div>
            </div>

            <div className={`min-w-0 ${cardClass} p-5 rounded-2xl shadow-[0_2px_6px_0_rgba(67,89,113,0.12)]`}>
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
              <div className="flex items-center justify-between p-5">
                <div>
                  <h2 className={`text-base font-black ${textPrimary}`}>
                    {t.recentOrders}
                  </h2>
                  <p className={`hidden text-xs sm:block ${textSecondary} mt-1`}>
                    {t.recentOrdersDesc}
                  </p>
                </div>

                <span className="rounded-full bg-[#696cff]/10 px-3 py-1 text-[11px] font-black text-[#696cff] transition-all duration-200 hover:scale-105 hover:bg-[#696cff]/20 cursor-default">
                  {recentOrders.length} {t.shown}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      dark ? "bg-[#232333]/80 text-slate-400 border-b border-[#4e4f6e]/50" : "bg-[#f5f5f9] text-[#566a7f] border-b border-slate-100"
                    } border-t`}
                  >
                    <tr>
                      <th className="px-5 py-3 font-bold">{t.order}</th>
                      <th className="px-5 py-3 font-bold">{t.table}</th>
                      <th className="px-5 py-3 text-center font-bold">{t.status}</th>
                      <th className="px-5 py-3 font-bold">{t.total}</th>
                      <th className="px-5 py-3 font-bold">{t.created}</th>
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
                          className={`border-b last:border-b-0 ${
                            dark
                              ? "border-[#4e4f6e]/50 hover:bg-[#232333]/40"
                              : "border-[#f0f2f5] hover:bg-[#f5f5f9]/50"
                          } transition-all duration-150`}
                        >
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1 rounded bg-[#696cff]/10 px-2 py-0.5 text-xs font-bold text-[#696cff]">
                              {formatShortOrderNo(order)}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            {order.tableNo || order.table?.name ? (
                              <span className={`inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-bold ${
                                dark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                              }`}>
                                {order.tableNo || order.table?.name}
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-bold ${
                                dark ? "bg-slate-700/60 text-slate-300" : "bg-slate-100 text-slate-600"
                              }`}>
                                {t.walkIn}
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-center">
                            <OrderStatusBadge status={order.status} />
                          </td>

                          <td className={`px-5 py-4 font-black ${textPrimary}`}>
                            {money(order.totalAmount)}
                          </td>

                          <td className={`px-5 py-4 text-xs font-semibold ${textSecondary}`}>
                            {formatRecentOrderTime(order.createdAt)}
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
                  <Line data={topProductChartData} options={topProductChartOptions} />
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
            </aside>
          </section>
        </div>
      </div>

      <style jsx>{`
        @keyframes dashboardPageIn {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}

function AnimatedCounter({ value }: { value?: string | number | null }) {
  const strVal = String(value ?? "");
  const match = strVal.match(/([^0-9.-]*)([0-9.,]+)(.*)/);

  const prefix = match ? match[1] || "" : "";
  const rawNumStr = match ? match[2].replace(/,/g, "") : "";
  const suffix = match ? match[3] || "" : "";
  const targetNum = match ? parseFloat(rawNumStr) : NaN;
  const isNumeric = match ? !isNaN(targetNum) : false;

  const decimalPlaces = isNumeric && rawNumStr.includes(".") ? rawNumStr.split(".")[1].length : 0;

  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isNumeric) return;

    let startTimestamp: number | null = null;
    const duration = 900;

    function step(timestamp: number) {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      setCount(targetNum * easeProgress);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCount(targetNum);
      }
    }

    const frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [targetNum, isNumeric]);

  if (!match || !isNumeric) return <>{strVal}</>;

  const formattedNum = count.toLocaleString("en-US", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });

  return (
    <>
      {prefix}
      {formattedNum}
      {suffix}
    </>
  );
}

function StatCard({
  label,
  value,
  note,
  tone,
  dark,
  sparklineData,
  sparklineColor = "#71dd37",
}: {
  label: string;
  value: string;
  note: string;
  tone: "green" | "blue" | "orange" | "red";
  dark: boolean;
  sparklineData?: number[];
  sparklineColor?: string;
}) {
  const tones = {
    green: "bg-[#e8fadf] text-[#71dd37]",
    blue: "bg-[#e7e7ff] text-[#696cff]",
    orange: "bg-[#fff2e2] text-[#ff9f43]",
    red: "bg-[#ffe5e5] text-[#ff3e1d]",
  };

  const miniChartData =
    sparklineData && sparklineData.length > 0
      ? {
          labels: sparklineData.map((_, i) => i),
          datasets: [
            {
              data: sparklineData,
              borderColor: sparklineColor,
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointRadius: sparklineData.map((_, i) => (i === sparklineData.length - 1 ? 5 : 0)),
              pointBackgroundColor: "#ffffff",
              pointBorderColor: sparklineColor,
              pointBorderWidth: 3,
              pointHoverRadius: 6,
              backgroundColor: (context: { chart: { ctx: CanvasRenderingContext2D } }) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 45);
                gradient.addColorStop(0, `${sparklineColor}45`);
                gradient.addColorStop(1, `${sparklineColor}05`);
                return gradient;
              },
            },
          ],
        }
      : null;

  const miniChartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    layout: {
      padding: {
        top: 4,
        right: 4,
        bottom: 2,
        left: 2,
      },
    },
  };

  return (
    <div
      className={`rounded border p-4 shadow-sm ${
        dark ? "border-[#4e4f6e] bg-[#2b2c40]" : "border-[#e5e7eb] bg-white"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#a1acb8]">{label}</div>
          <div
            className={`mt-1 text-2xl font-bold tracking-tight ${
              dark ? "text-slate-100" : "text-[#566a7f]"
            }`}
          >
            <AnimatedCounter value={value} />
          </div>
        </div>

        <span className={`rounded px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>
          Live
        </span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="text-xs font-semibold text-[#8592a3]">{note}</div>
        {miniChartData && (
          <div className="h-10 w-24 flex-shrink-0">
            <Line data={miniChartData} options={miniChartOptions} />
          </div>
        )}
      </div>
    </div>
  );
}
