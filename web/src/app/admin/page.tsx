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
import { BellRing, CheckCircle2, Clock, DollarSign, Grid2X2, ShoppingBag, TrendingUp, X, ChevronDown, CalendarDays } from "lucide-react";
import type {
  DailySalesReport,
  Order,
  TopProductReport,
} from "../../lib/types";
import { useAutoDismiss } from "../../lib/useAutoDismiss";

function formatShortOrderNo(order: Order) {
  if (order.id) {
    return `#${String(order.id).padStart(4, "0")}`;
  }
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

function getOrderTableName(order: Order, fallbackText: string) {
  if (order.tableNo) return order.tableNo;
  if (order.table?.name) return order.table.name;
  if (order.notes) {
    const match = order.notes.match(/(?:table|តុ)\s*[:#-]?\s*([^\n,]+)/i);
    if (match && match[1]) return match[1].trim();
  }
  return fallbackText;
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
    by: "by",
    qrOrder: "via QR Ordering",
    posCounter: "POS Counter",
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
    table: "តុ / អ្នកកុម្ម៉ង់",
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
    by: "ដោយ",
    qrOrder: "តាម QR Ordering",
    posCounter: "បញ្ជរ POS",
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

let cachedOrders: Order[] | null = null;
let cachedDailySales: DailySalesReport | null = null;
let cachedTopProducts: TopProductReport[] | null = null;

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
  const [userName, setUserName] = useState("Admin");

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("pos_user");
      if (rawUser) {
        const u = JSON.parse(rawUser);
        if (u.name) setUserName(u.name);
      }
    } catch {}
  }, []);

  const [orders, setOrders] = useState<Order[]>(cachedOrders || []);
  const [dailySales, setDailySales] = useState<DailySalesReport | null>(cachedDailySales || null);
  const [topProducts, setTopProducts] = useState<TopProductReport[]>(cachedTopProducts || []);
  const [orderAlerts, setOrderAlerts] = useState<NotificationItem[]>([]);
  const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null);
  const [clearedNotificationIds, setClearedNotificationIds] = useState<Set<string>>(
    () => new Set()
  );
  const [clearedActiveOrderIds, setClearedActiveOrderIds] = useState<Set<number>>(
    getClearedActiveOrderIds
  );
  const [loading, setLoading] = useState(!cachedOrders);
  const [error, setError] = useState("");
  useAutoDismiss(error, setError);

  const dark = theme === "dark";
  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const softSurface = dark ? "bg-[#232333]" : "bg-white";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-slate-200/70";
  const textPrimary = dark ? "text-slate-100" : "text-[#2c3e50]";
  const textSecondary = dark ? "text-slate-400" : "text-[#64748b]";
  const cardClass = `rounded-2xl border ${borderCol} ${surface} shadow-none hover:shadow-md hover:shadow-slate-200/60 dark:hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-200`;

  const t = TEXT[language];

  useEffect(() => {
    cachedOrders = orders;
    cachedDailySales = dailySales;
    cachedTopProducts = topProducts;
  }, [orders, dailySales, topProducts]);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      getDailySales().catch(() => ({ totalSales: 0, totalOrders: 0, ordersCount: 0, salesByHour: [] })),
      getOrders().catch(() => []),
      getTopProducts().catch(() => []),
    ])
      .then(([sales, orderRows, topRows]) => {
        if (!mounted) return;
        cachedDailySales = sales as any; setDailySales(cachedDailySales);
        cachedOrders = orderRows as any; setOrders(cachedOrders);
        cachedTopProducts = topRows as any; setTopProducts(cachedTopProducts);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function handleClearedEvent() {
      setToastNotification(null);
      setOrderAlerts([]);
    }
    window.addEventListener("pos-notifications-cleared", handleClearedEvent);
    return () => window.removeEventListener("pos-notifications-cleared", handleClearedEvent);
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = order.items?.map((i: any) => ({
          name: i.product?.name || i.name || "Item",
          quantity: i.quantity || 1,
          price: Number(i.unitPrice || i.price || 0),
          notes: i.notes || i.specialNotes,
          image: i.product?.image || i.image,
        }));

        const newNotif = {
          id: `order-${order.id}-${Date.now()}`,
          title: t.newOrderAlert,
          detail,
          orderId: order.id,
          orderNumber: label,
          tableNo: String(table || ""),
          totalAmount: Number(order.totalAmount || 0),
          items,
        };

        setToastNotification(newNotif);
        setTimeout(() => setToastNotification(null), 6000);

        return [
          newNotif,
          ...current,
        ].slice(0, 5);
      });
    }

    function handleOrderUpdated(order: Order) {
      setOrders((current) =>
        current.map((entry) => (entry.id === order.id ? order : entry))
      );
    }

    function handleNotificationsCleared() {
      setOrderAlerts([]);
      setToastNotification(null);
    }

    socket.on("order:created", handleOrderCreated);
    socket.on("order:updated", handleOrderUpdated);
    socket.on("notifications:cleared", handleNotificationsCleared);

    return () => {
      socket.off("order:created", handleOrderCreated);
      socket.off("order:updated", handleOrderUpdated);
      socket.off("notifications:cleared", handleNotificationsCleared);
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
  
  const recentOrders = useMemo(() => orders.slice(0, 4), [orders]);

  const centerTextPlugin = useMemo(() => ({
    id: "centerText",
    beforeDraw: (chart: any) => {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      ctx.save();
      
      const activeCount = activeOrders.length;
      
      ctx.font = "bold 20px 'Public Sans', sans-serif";
      ctx.fillStyle = dark ? "#f8fafc" : "#1e293b";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      const centerX = (chartArea.left + chartArea.right) / 2;
      const centerY = (chartArea.top + chartArea.bottom) / 2;
      
      ctx.fillText(String(activeCount), centerX, centerY - 6);
      
      ctx.font = "600 9px 'Public Sans', sans-serif";
      ctx.fillStyle = dark ? "#94a3b8" : "#64748b";
      ctx.fillText(language === "km" ? "សកម្ម" : "Active", centerX, centerY + 12);
      
      ctx.restore();
    }
  }), [activeOrders.length, dark, language]);

  const verticalLinePlugin = useMemo(() => ({
    id: "verticalLine",
    afterDraw: (chart: any) => {
      if (chart.tooltip?._active?.length) {
        const activePoint = chart.tooltip._active[0];
        const ctx = chart.ctx;
        const x = activePoint.element.x;
        const topY = chart.chartArea.top;
        const bottomY = chart.chartArea.bottom;

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(x, topY);
        ctx.lineTo(x, bottomY);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = dark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.15)";
        ctx.stroke();
        ctx.restore();
      }
    },
  }), [dark]);

  const STATUS_CONFIG = useMemo(
    () => [
      { key: "pending", label: "pending", keys: ["pending"], color: "#71dd37" },
      { key: "preparing", label: "preparing", keys: ["preparing", "served", "in_progress"], color: "#ff9f43" },
      { key: "completed", label: "completed", keys: ["completed", "paid"], color: "#03c3ec" },
      { key: "cancelled", label: "cancelled", keys: ["cancelled", "voided"], color: "#ff3e1d" },
    ],
    []
  );

  const orderStatusChartData = useMemo(() => {
    const counts = STATUS_CONFIG.map(
      (cfg) => orders.filter((o) => cfg.keys.includes((o.status || "").toLowerCase())).length
    );

    return {
      labels: STATUS_CONFIG.map((cfg) => cfg.label),
      datasets: [
        {
          label: "Orders",
          data: counts,
          backgroundColor: STATUS_CONFIG.map((cfg) => cfg.color),
          borderWidth: 2,
          borderColor: dark ? "#2b2c40" : "#ffffff",
          hoverOffset: 4,
        },
      ],
    };
  }, [orders, dark, STATUS_CONFIG]);

  const salesByHour = useMemo(() => {
    const rows = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      total: 0,
      count: 0,
    }));

    orders.forEach((order) => {
      const date = new Date(order.createdAt);
      if (!Number.isNaN(date.getTime())) {
        const hour = date.getHours();
        if (hour >= 0 && hour < 24) {
          if (order.status !== "cancelled") {
            rows[hour].total += Number(order.totalAmount || 0);
          }
          rows[hour].count += 1;
        }
      }
    });
 
    return rows;
  }, [orders]);

  const salesByDay = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    return days.map((day) => {
      const dayStr = day.toDateString();
      const dateLabel = day.toLocaleDateString(language === "km" ? "km-KH" : "en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      const total = orders
        .filter((o) => {
          const createdAt = new Date(o.createdAt);
          return (
            !Number.isNaN(createdAt.getTime()) &&
            createdAt.toDateString() === dayStr &&
            (o.status || "").toLowerCase() !== "cancelled"
          );
        })
        .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

      return {
        label: dateLabel,
        total,
      };
    });
  }, [orders, language]);

  const peakSalesHour = useMemo(() => {
    return salesByHour.reduce(
      (peak, row) => (row.total > peak.total ? row : peak),
      { hour: 0, total: 0, count: 0 }
    );
  }, [salesByHour]);

  const hourlySalesTotals = salesByHour.map((h) => h.total);
  const hourlyOrderCounts = salesByHour.map((h) => h.count);

  const computedTodaySales = useMemo(() => {
    const todayStr = new Date().toDateString();
    const sumFromOrders = orders
      .filter((o) => {
        const d = new Date(o.createdAt);
        return !Number.isNaN(d.getTime()) && d.toDateString() === todayStr && (o.status || "").toLowerCase() !== "cancelled";
      })
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    if (sumFromOrders > 0) return sumFromOrders;
    return Number(dailySales?.totalSales || 0);
  }, [dailySales, orders]);

  const computedPaidTotal = useMemo(() => {
    const todayStr = new Date().toDateString();
    const paidFromOrders = orders
      .filter((o) => {
        const d = new Date(o.createdAt);
        const st = (o.status || "").toLowerCase();
        return !Number.isNaN(d.getTime()) && d.toDateString() === todayStr && (st === "completed" || st === "paid" || st === "served");
      })
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    if (paidFromOrders > 0) return paidFromOrders;
    return Number(dailySales?.paidTotal || 0);
  }, [dailySales, orders]);

  const computedTodayOrdersCount = useMemo(() => {
    const todayStr = new Date().toDateString();
    const countFromOrders = orders.filter((o) => {
      const d = new Date(o.createdAt);
      return !Number.isNaN(d.getTime()) && d.toDateString() === todayStr;
    }).length;

    if (countFromOrders > 0) return countFromOrders;
    return Number(dailySales?.orderCount || 0);
  }, [dailySales, orders]);

  const computedTopProducts = useMemo(() => {
    const stripExt = (name: string) => (name || "").replace(/\.(jpg|jpeg|png|webp|gif)$/i, "").trim();

    if (topProducts && topProducts.length > 0) {
      return topProducts.map((p) => ({
        ...p,
        productName: stripExt(p.productName || (p as any).name || "Item"),
      }));
    }

    const map = new Map<string, { productId: number; productName: string; totalSales: number }>();
    orders.forEach((o) => {
      if (o.status === "cancelled") return;
      (o.items || []).forEach((item: any) => {
        const rawName = item.product?.name || item.name || "Item";
        const pName = stripExt(rawName);
        const pId = item.productId || item.id || 1;
        const sales = Number(item.unitPrice || item.price || 0) * (item.quantity || 1);
        const existing = map.get(pName);
        if (existing) {
          existing.totalSales += sales;
        } else {
          map.set(pName, { productId: pId, productName: pName, totalSales: sales });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalSales - a.totalSales);
  }, [topProducts, orders]);

  const stats = [
    {
      label: t.todaySales,
      value: money(computedTodaySales),
      note: `${t.paid} ${money(computedPaidTotal)}`,
      tone: "green" as const,
      Icon: DollarSign,
    },
    {
      label: t.todayOrders,
      value: String(computedTodayOrdersCount),
      note: t.ordersCreatedToday,
      tone: "blue" as const,
      Icon: ShoppingBag,
    },
    {
      label: t.activeOrders,
      value: String(activeOrders.length),
      note: t.kitchenQueue,
      tone: "orange" as const,
      Icon: Clock,
    },
    {
      label: t.completedOrders,
      value: String(orders.filter((order) => order.status === "completed").length),
      note: t.ordersCompleted,
      tone: "green" as const,
      Icon: CheckCircle2,
    },
  ];

  const notifications = useMemo(() => {
    const items: NotificationItem[] = [];

    orderAlerts.forEach((alert) => {
      if (!items.some((i) => i.id === alert.id)) {
        items.push(alert);
      }
    });

    activeOrders.forEach((order) => {
      const label = formatShortOrderNo(order);
      const table = order.table?.name || order.tableNo;
      const detail = table ? `Table ${table} • ${money(order.totalAmount || 0)}` : `${money(order.totalAmount || 0)}`;
      if (!items.some((i) => i.orderId === order.id)) {
        items.push({
          id: `order-active-${order.id}`,
          title: `Order ${label} (${(order.status || "pending").toUpperCase()})`,
          detail,
          orderId: order.id,
          orderNumber: label,
          tableNo: String(table || ""),
          totalAmount: Number(order.totalAmount || 0),
        });
      }
    });

    return items.filter((item) => !clearedNotificationIds.has(item.id));
  }, [clearedNotificationIds, orderAlerts, activeOrders]);

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
    setToastNotification(null);
  }

  const topProductChartData = {
    labels: computedTopProducts.slice(0, 5).map((item) => item.productName),
    datasets: [
      {
        label: "Sales",
        data: computedTopProducts.slice(0, 5).map((item) => Number(item.totalSales)),
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

  const [trendRange, setTrendRange] = useState<"today" | "yesterday" | "7days" | "month">("7days");
  const [trendMenuOpen, setTrendMenuOpen] = useState(false);

  useEffect(() => {
    const handleClose = () => setTrendMenuOpen(false);
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, []);

  const salesTrendData = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();

    if (trendRange === "today") {
      const hoursArray = Array.from({ length: 24 }, (_, h) => ({
        label: hourLabel(h),
        total: 0,
      }));
      orders.forEach((o) => {
        const d = new Date(o.createdAt);
        if (!Number.isNaN(d.getTime()) && d.toDateString() === todayStr && (o.status || "").toLowerCase() !== "cancelled") {
          const hour = d.getHours();
          if (hour >= 0 && hour < 24) {
            hoursArray[hour].total += Number(o.totalAmount || 0);
          }
        }
      });
      return hoursArray.slice(7, 23);
    }

    if (trendRange === "yesterday") {
      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toDateString();
      const hoursArray = Array.from({ length: 24 }, (_, h) => ({
        label: hourLabel(h),
        total: 0,
      }));
      orders.forEach((o) => {
        const d = new Date(o.createdAt);
        if (!Number.isNaN(d.getTime()) && d.toDateString() === yestStr && (o.status || "").toLowerCase() !== "cancelled") {
          const hour = d.getHours();
          if (hour >= 0 && hour < 24) {
            hoursArray[hour].total += Number(o.totalAmount || 0);
          }
        }
      });
      return hoursArray.slice(7, 23);
    }

    if (trendRange === "month") {
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
        const dayNum = i + 1;
        const d = new Date(year, month, dayNum);
        const dayStr = d.toDateString();
        const dateLabel = d.toLocaleDateString(language === "km" ? "km-KH" : "en-US", {
          month: "short",
          day: "numeric",
        });

        const total = orders
          .filter((o) => {
            const createdAt = new Date(o.createdAt);
            return (
              !Number.isNaN(createdAt.getTime()) &&
              createdAt.toDateString() === dayStr &&
              (o.status || "").toLowerCase() !== "cancelled"
            );
          })
          .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

        return { label: dateLabel, total };
      });
    }

    return salesByDay;
  }, [trendRange, orders, language, salesByDay]);

  const salesTrendChartData = {
    labels: salesTrendData.map((item) => item.label),
    datasets: [
      {
        label: "Revenue",
        data: salesTrendData.map((item) => item.total),
        yAxisID: "y",
        fill: true,
        tension: 0.45,
        borderWidth: 3.5,
        borderColor: "#48cf38",
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor: "#48cf38",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 3,
        pointHoverBackgroundColor: "#48cf38",
        pointHoverBorderColor: "#ffffff",
        pointHoverBorderWidth: 3,
        backgroundColor: (context: { chart: { ctx: CanvasRenderingContext2D } }) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 220);
          gradient.addColorStop(0, dark ? "rgba(72, 207, 56, 0.3)" : "rgba(72, 207, 56, 0.2)");
          gradient.addColorStop(0.7, dark ? "rgba(72, 207, 56, 0.05)" : "rgba(72, 207, 56, 0.02)");
          gradient.addColorStop(1, "rgba(72, 207, 56, 0)");
          return gradient;
        },
      },
    ],
  };

  const KHMER_CHART_FONT = "'Kantumruy Pro', 'Battambang', 'Noto Sans Khmer', 'Plus Jakarta Sans', sans-serif";

  const commonTooltip = {
    backgroundColor: dark ? "#1e1f2e" : "#22252a",
    titleColor: "#ffffff",
    bodyColor: "#ffffff",
    borderColor: dark ? "#3b3c54" : "#3a3d45",
    borderWidth: 1,
    padding: 12,
    boxPadding: 6,
    cornerRadius: 10,
    usePointStyle: true,
    titleFont: {
      family: KHMER_CHART_FONT,
      size: 13,
      weight: "normal" as const,
      lineHeight: 1.4,
    },
    bodyFont: {
      family: KHMER_CHART_FONT,
      size: 12,
      weight: 400,
      lineHeight: 1.4,
    },
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
        display: false,
      },
      tooltip: {
        ...commonTooltip,
        callbacks: {
          title: (items: TooltipItem<"line">[]) => items[0]?.label || "",
          label: (context: TooltipItem<"line">) => ` Revenue: ${money(context.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: dark ? "#94a3b8" : "#94a3b8",
          maxRotation: 0,
          autoSkip: true,
          autoSkipPadding: 18,
          font: { family: KHMER_CHART_FONT, size: 11 },
        },
        grid: {
          display: false,
        },
        border: { display: false },
      },
      y: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        beginAtZero: true,
        ticks: {
          color: dark ? "#94a3b8" : "#94a3b8",
          callback: (value: string | number) => {
            const num = Number(value || 0);
            if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
            if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
            return `$${num.toFixed(0)}`;
          },
          font: { family: KHMER_CHART_FONT, size: 11 },
          padding: 8,
        },
        grid: {
          color: dark ? "rgba(255, 255, 255, 0.05)" : "rgba(226, 232, 240, 0.7)",
          drawTicks: false,
        },
        border: { display: false, dash: [4, 4] },
      },
    },
  };

  const topProductChartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        ...commonTooltip,
        callbacks: {
          title: (items: TooltipItem<"line">[]) => {
            const idx = items[0]?.dataIndex;
            if (idx !== undefined && computedTopProducts[idx]) {
              return computedTopProducts[idx].productName;
            }
            return items[0]?.label || "";
          },
          label: (context: TooltipItem<"line">) => ` ${language === "km" ? "ចំនួនលក់:" : "Sales:"} ${context.parsed.y ?? 0}`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: dark ? "#94a3b8" : "#64748b",
          font: { family: KHMER_CHART_FONT, size: 10.5, weight: "normal" },
          padding: 8,
          maxRotation: 20,
          minRotation: 0,
          autoSkip: true,
          autoSkipPadding: 8,
          callback: function (val: any) {
            const label = this.getLabelForValue(Number(val));
            if (!label) return "";
            return label.length > 8 ? label.substring(0, 7) + "…" : label;
          },
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
          font: { family: KHMER_CHART_FONT, size: 11 },
          padding: 6,
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
        display: false,
      },
      tooltip: commonTooltip,
    },
  };

  return (
    <main
        className={`flex-1 overflow-y-auto ${language === "km" ? "font-khmer" : ""}`}
      >

        {toastNotification && (
          <div className="fixed top-20 right-6 z-50 flex items-center gap-3 rounded-xl border border-indigo-200/80 bg-white/95 dark:bg-[#2b2c40]/95 px-4 py-3 text-sm font-semibold text-[#696cff] dark:text-indigo-300 shadow-2xl shadow-slate-900/15 backdrop-blur-md animate-[slideFromRight_250ms_cubic-bezier(0.16,1,0.3,1)]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#696cff]/15 text-[#696cff] shrink-0">
              <BellRing size={16} className="animate-bounce" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-extrabold uppercase text-[#696cff] tracking-wider">New Real-Time Order Received</div>
              <div className={`text-xs font-bold ${dark ? "text-slate-200" : "text-[#2c3e50]"} truncate`}>{toastNotification.detail} • {money(toastNotification.totalAmount || 0)}</div>
            </div>
            <button
              type="button"
              onClick={() => setToastNotification(null)}
              className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div className="mx-auto w-full max-w-[1720px] px-3.5 sm:px-4 pt-2.5 pb-5 dash-animate">
          {/* Dashboard Page Header */}
          <div className="mb-5 flex items-center gap-3  dash-delay-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#48cf38]/10 text-[#48cf38]">
              <Grid2X2 size={20} />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${dark ? "text-white" : "text-slate-900"} ${language === "km" ? "font-khmer" : ""}`}>
                {language === "km" ? "ផ្ទាំងគ្រប់គ្រង" : "Dashboard"}
              </h1>
              <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"} ${language === "km" ? "font-khmer text-[11px]" : ""}`}>
                {language === "km" ? "ផ្ទាំងគ្រប់គ្រងផ្ទាល់ខ្លួនរបស់អ្នក។" : "Your personalized command center."}
              </p>
            </div>
          </div>

          <div>
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          <section className="mb-4 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat, idx) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={loading ? "..." : stat.value}
                tone={stat.tone}
                dark={dark}
                index={idx}
                Icon={stat.Icon}
                animClass={` dash-delay-${idx + 1}`}
              />
            ))}
          </section>

          <section className="mb-4 grid gap-4 grid-cols-1 xl:grid-cols-12">
            <div className={`min-w-0 xl:col-span-8 ${cardClass} p-5 rounded-2xl shadow-none  dash-delay-5`}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className={`text-base font-bold ${textPrimary}`}>
                  {language === "km" ? "និន្នាការចំណូល" : "Revenue Trend"}
                </h2>
                {/* Modern Custom Dropdown Component matching System Design */}
                <div className="relative inline-block text-left">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrendMenuOpen(!trendMenuOpen);
                    }}
                    className={`flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs font-semibold outline-none transition-all cursor-pointer shadow-none ${
                      dark
                        ? "border-[#4e4f6e] bg-[#232333] text-slate-200 hover:bg-[#34354e]"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-[#696cff] shrink-0">
                      {trendRange === "today" || trendRange === "yesterday" ? (
                        <Clock size={13} />
                      ) : trendRange === "month" ? (
                        <CalendarDays size={13} />
                      ) : (
                        <TrendingUp size={13} />
                      )}
                    </span>
                    <span>
                      {language === "km"
                        ? trendRange === "today"
                          ? "ថ្ងៃនេះ"
                          : trendRange === "yesterday"
                          ? "ម្សិលមិញ"
                          : trendRange === "month"
                          ? "ខែនេះ"
                          : "៧ ថ្ងៃចុងក្រោយ"
                        : trendRange === "today"
                        ? "Today"
                        : trendRange === "yesterday"
                        ? "Yesterday"
                        : trendRange === "month"
                        ? "This Month"
                        : "Last 7 Days"}
                    </span>
                    <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${trendMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {trendMenuOpen && (
                    <div
                      className={`absolute right-0 top-full mt-1.5 z-50 w-44 rounded-2xl border p-1.5 text-left shadow-xl animate-[fadeIn_100ms_ease-out] ${
                        dark ? "border-[#3b3c54] bg-[#2b2c40]" : "border-slate-200/80 bg-white"
                      }`}
                    >
                      {[
                        { key: "today", labelKm: "ថ្ងៃនេះ", labelEn: "Today", Icon: Clock },
                        { key: "yesterday", labelKm: "ម្សិលមិញ", labelEn: "Yesterday", Icon: Clock },
                        { key: "7days", labelKm: "៧ ថ្ងៃចុងក្រោយ", labelEn: "Last 7 Days", Icon: TrendingUp },
                        { key: "month", labelKm: "ខែនេះ", labelEn: "This Month", Icon: CalendarDays },
                      ].map((opt) => {
                        const isActive = trendRange === opt.key;
                        const IconComp = opt.Icon;
                        const label = language === "km" ? opt.labelKm : opt.labelEn;

                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTrendRange(opt.key as any);
                              setTrendMenuOpen(false);
                            }}
                            className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                              isActive
                                ? "bg-[#696cff]/10 text-[#696cff] font-bold"
                                : dark
                                ? "text-slate-200 hover:bg-[#34354e]"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <IconComp size={13} className={isActive ? "text-[#696cff]" : "text-slate-400"} />
                            <span className="flex-1 text-left">{label}</span>
                            {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#696cff]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div
                className="h-[230px] min-w-0 pt-2 pb-1"
              >
                <Line data={salesTrendChartData} options={salesChartOptions} plugins={[verticalLinePlugin]} />
              </div>
            </div>

            <div className={`min-w-0 xl:col-span-4 ${cardClass} p-5 rounded-2xl shadow-none flex flex-col justify-between  dash-delay-6`}>
              <div className="mb-3">
                <h2 className={`text-base font-bold ${textPrimary}`}>
                  {t.orderStatus}
                </h2>
              </div>

              <div
                className="flex-1 min-w-0 flex flex-col justify-between pt-1"
              >
                <div className="relative h-[125px] flex items-center justify-center">
                  <Doughnut data={orderStatusChartData} options={doughnutOptions} plugins={[centerTextPlugin]} />
                </div>
                
                {/* Premium Custom HTML Legend Grid */}
                <div className={`grid grid-cols-2 gap-x-3 gap-y-2 text-[10px] font-bold ${dark ? "text-slate-400 border-[#4e4f6e]/30" : "text-slate-500 border-slate-100"} border-t pt-3 mt-1.5`}>
                  {STATUS_CONFIG.map((cfg) => {
                    const count = orders.filter((o) => cfg.keys.includes((o.status || "").toLowerCase())).length;
                    const total = orders.length || 1;
                    const pct = Math.round((count / total) * 100);
                    
                    // Localized label mapping to prevent modifying application logic
                    let displayLabel = cfg.label;
                    if (language === "km") {
                      if (cfg.key === "pending") displayLabel = "រង់ចាំ";
                      else if (cfg.key === "preparing") displayLabel = "រៀបចំ";
                      else if (cfg.key === "completed") displayLabel = "ជោគជ័យ";
                      else if (cfg.key === "cancelled") displayLabel = "បោះបង់";
                    }

                    return (
                      <div key={cfg.key} className="flex items-center gap-1.5 min-w-0 justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                          <span className="truncate capitalize text-slate-400">{displayLabel}:</span>
                        </div>
                        <span className={`font-black shrink-0 ${dark ? "text-slate-300" : "text-slate-700"}`}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 grid-cols-1 xl:grid-cols-12 items-stretch">
            <div className={`min-w-0 xl:col-span-8 overflow-hidden ${cardClass}  dash-delay-7`}>
              <div className="flex items-center justify-between p-5">
                <div>
                  <h2 className={`text-base font-black ${textPrimary}`}>
                    {t.recentOrders}
                  </h2>
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
                              ? "border-[#4e4f6e]/30 hover:bg-[#2b2c40]/40"
                              : "border-slate-100 hover:bg-slate-50/40"
                          } transition-colors duration-200`}
                        >
                          <td className="px-5 py-4">
                            <span className={`text-xs font-extrabold cursor-default hover:underline transition-all duration-200 ${dark ? "text-[#8285ff]" : "text-[#696cff]"}`}>
                              {formatShortOrderNo(order)}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-0.5">
                              <div>
                                {getOrderTableName(order, t.walkIn) !== t.walkIn ? (
                                  <span className={`inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-bold ${
                                    dark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                                  }`}>
                                    {getOrderTableName(order, t.walkIn)}
                                  </span>
                                ) : (
                                  <span className={`inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-bold ${
                                    dark ? "bg-slate-700/60 text-slate-300" : "bg-slate-100 text-slate-600"
                                  }`}>
                                    {t.walkIn}
                                  </span>
                                )}
                              </div>
                              <span className={`text-[11px] font-medium ${textSecondary}`}>
                                {order.createdBy?.name
                                  ? `${t.by} ${order.createdBy.name}`
                                  : order.tableId || order.tableNo || getOrderTableName(order, "")
                                    ? t.qrOrder
                                    : t.posCounter}
                              </span>
                            </div>
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

            <div className="min-w-0 xl:col-span-4  dash-delay-8">
              <div className={`${cardClass} p-5 h-full flex flex-col`}>
                <div className="mb-4">
                  <h2 className={`text-base font-bold ${textPrimary}`}>
                    {t.topProducts}
                  </h2>
                </div>

                {computedTopProducts.length === 0 ? (
                  <div className={`text-xs ${textSecondary} py-8 text-center flex-1 flex items-center justify-center`}>
                    {t.noProductSales}
                  </div>
                ) : (
                  <div
                    className="min-w-0 flex-1 flex flex-col justify-center items-center pt-1"
                  >
                    <div className="w-full h-[220px] relative">
                      <Line data={topProductChartData} options={topProductChartOptions} />
                    </div>
                  </div>
                )}
              </div>
            </div>
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
  const [displayValue, setDisplayValue] = useState(value ?? "");

  useEffect(() => {
    if (value === null || value === undefined) {
      setDisplayValue("");
      return;
    }

    const strValue = String(value);
    const match = strValue.match(/[\d.]+/);
    if (!match) {
      setDisplayValue(strValue);
      return;
    }

    const targetNum = parseFloat(match[0]);
    if (Number.isNaN(targetNum)) {
      setDisplayValue(strValue);
      return;
    }

    const prefix = strValue.slice(0, match.index);
    const suffix = strValue.slice(match.index! + match[0].length);

    const decimalParts = match[0].split(".");
    const decimals = decimalParts.length > 1 ? decimalParts[1].length : 0;

    const start = 0;
    const duration = 800; // Animation duration in milliseconds
    const startTime = performance.now();

    let animationFrameId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function: easeOutQuad
      const easedProgress = progress * (2 - progress);
      const currentNum = start + targetNum * easedProgress;

      setDisplayValue(`${prefix}${currentNum.toFixed(decimals)}${suffix}`);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(strValue);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value]);

  return <>{displayValue}</>;
}

function StatCard({
  label,
  value,
  tone,
  dark,
  Icon,
  animClass = "",
}: {
  label: string;
  value: string;
  tone: "green" | "blue" | "orange" | "red";
  dark: boolean;
  index?: number;
  animClass?: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  const iconTones = {
    green: dark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600",
    blue: dark ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600",
    orange: dark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600",
    red: dark ? "bg-rose-500/10 text-rose-400" : "bg-rose-50 text-rose-600",
  };

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 shadow-none hover:shadow-md hover:shadow-slate-200/60 dark:hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between ${
        dark ? "border-[#4e4f6e] bg-[#2b2c40]" : "border-slate-200/80 bg-white"
      } ${animClass}`}
    >
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

      <div className={`p-2.5 rounded-xl shrink-0 ${iconTones[tone] || iconTones.green}`}>
        <Icon size={20} />
      </div>
    </div>
  );
}
