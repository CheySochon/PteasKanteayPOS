"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Download,
  Eye,
  Filter,
  MoreVertical,
  Printer,
  Banknote,
  ReceiptText,
  ShoppingBag,
  Utensils,
  X,
} from "lucide-react";
import TopBar from "../../../components/TopBar";
import OrderStatusBadge from "../../../components/OrderStatusBadge";
import { getOrders, getSettings, resolveImageUrl, updateOrderStatus } from "../../../lib/api";
import { useAppLanguage } from "../../../lib/language";
import { getSocket } from "../../../lib/socket";
import { useAppTheme } from "../../../lib/theme";
import type { AppSettings, Order, OrderStatus } from "../../../lib/types";
import { useAutoDismiss } from "../../../lib/useAutoDismiss";

// Simplified 4 core statuses: Pending, Preparing, Completed, Cancelled
const statusOptions: OrderStatus[] = [
  "pending",
  "preparing",
  "completed",
  "cancelled",
];

const orderTabs: {
  label: string;
  value: "all" | "active" | "completed" | "cancelled";
}[] = [
  { label: "All Orders", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const rowsPerPage = 6;

const TEXT = {
  en: {
    badge: "Order Management",
    title: "Orders",
    subtitle: "Monitor and manage kitchen operations in real-time.",
    filter: "Filter",
    export: "Export",
    activeOrders: "Active Orders",
    completedToday: "Completed Today",
    cancelled: "Cancelled",
    totalRevenue: "Total Revenue",
    fromLastHour: "from last hour",
    fromYesterday: "from yesterday",
    cancellationRate: "cancellation rate",
    vsLastShift: "vs last shift",
    tabs: {
      all: "All Orders",
      active: "Active",
      completed: "Completed",
      cancelled: "Cancelled",
    },
    search: "Search",
    searchPlaceholder: "Order, table, server...",
    status: "Status",
    allStatus: "All Status",
    orderType: "Order Type",
    allTypes: "All Types",
    dineIn: "Dine-in",
    takeout: "Takeout",
    reset: "Reset",
    headers: {
      orderId: "Order ID",
      table: "Table #",
      server: "BY",
      time: "Time",
      status: "Status",
      total: "Total Amount",
      actions: "Actions",
    },
    loading: "Loading orders...",
    empty: "No orders found",
    changeStatus: "Change Status",
    showing: "Showing",
    to: "to",
    of: "of",
    orders: "orders",
    urgent: "Urgent Orders",
    urgentDesc: "Preparing orders that may need attention.",
    noUrgent: "No urgent preparing orders.",
    walkIn: "Walk-in",
    waitingFor: "Waiting for",
    min: "min",
    expedite: "Expedite",
    kitchenPerformance: "Kitchen Performance",
    kitchenDesc: "Average prep time overview.",
    avgPrep: "Average prep time",
    live: "Live",
    viewDetails: "View Details",
    orderDetails: "Order Details",
    itemsOrdered: "Items Ordered",
    item: "Item",
    qty: "Qty",
    price: "Price",
    total: "Total",
    noItems: "No item details available",
    close: "Close",
  },
  km: {
    badge: "គ្រប់គ្រងការបញ្ជាទិញ",
    title: "ការបញ្ជាទិញ",
    subtitle: "តាមដាន និងគ្រប់គ្រងប្រតិបត្តិការផ្ទះបាយជាក់ស្តែង។",
    filter: "ចម្រោះ",
    export: "នាំចេញ",
    activeOrders: "ការបញ្ជាទិញសកម្ម",
    completedToday: "បានបញ្ចប់ថ្ងៃនេះ",
    cancelled: "បានបោះបង់",
    totalRevenue: "ចំណូលសរុប",
    fromLastHour: "ពីម៉ោងមុន",
    fromYesterday: "ពីម្សិលមិញ",
    cancellationRate: "អត្រាបោះបង់",
    vsLastShift: "ធៀបនឹងវេនមុន",
    tabs: {
      all: "ទាំងអស់",
      active: "សកម្ម",
      completed: "បានបញ្ចប់",
      cancelled: "បានបោះបង់",
    },
    search: "ស្វែងរក",
    searchPlaceholder: "លេខបញ្ជា តុ ឬបុគ្គលិក...",
    status: "ស្ថានភាព",
    allStatus: "ស្ថានភាពទាំងអស់",
    orderType: "ប្រភេទបញ្ជា",
    allTypes: "ប្រភេទទាំងអស់",
    dineIn: "ញាំនៅហាង",
    takeout: "យកទៅក្រៅ",
    reset: "កំណត់ឡើងវិញ",
    headers: {
      orderId: "លេខបញ្ជា",
      table: "លេខតុ",
      server: "បុគ្គលិក",
      time: "ម៉ោង",
      status: "ស្ថានភាព",
      total: "ចំនួនទឹកប្រាក់",
      actions: "សកម្មភាព",
    },
    loading: "កំពុងផ្ទុកការបញ្ជាទិញ...",
    empty: "រកមិនឃើញការបញ្ជាទិញ",
    changeStatus: "ប្ដូរស្ថានភាព",
    showing: "បង្ហាញ",
    to: "ដល់",
    of: "នៃ",
    orders: "ការបញ្ជាទិញ",
    urgent: "ការបញ្ជាទិញបន្ទាន់",
    urgentDesc: "ការបញ្ជាទិញកំពុងរៀបចំដែលត្រូវការតាមដាន។",
    noUrgent: "មិនមានការបញ្ជាទិញបន្ទាន់ទេ។",
    walkIn: "ភ្ញៀវមកផ្ទាល់",
    waitingFor: "រង់ចាំ",
    min: "នាទី",
    expedite: "ពន្លឿន",
    kitchenPerformance: "ប្រសិទ្ធភាពផ្ទះបាយ",
    kitchenDesc: "សេចក្តីសង្ខេបរយៈពេលរៀបចំមធ្យម។",
    avgPrep: "រយៈពេលរៀបចំមធ្យម",
    live: "ផ្ទាល់",
    viewDetails: "មើលមុខម្ហូបកុម្ម៉ង់",
    orderDetails: "ព័ត៌មានលម្អិតការបញ្ជាទិញ",
    itemsOrdered: "មុខម្ហូបដែលបានកុម្ម៉ង់",
    item: "មុខម្ហូប",
    qty: "ចំនួន",
    price: "តម្លៃ",
    total: "សរុប",
    noItems: "មិនមានព័ត៌មានមុខម្ហូបឡើយ",
    close: "បិទ",
  },
};

type OrderTab = "all" | "active" | "completed" | "cancelled";
type OrderTypeFilter = "all" | "dine-in" | "takeout";

const RIEL_RATE = 4100;

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

function money(value: number | string) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function moneyRiel(value: number | string) {
  const num = Number(value || 0);
  const riel = Math.round(num * RIEL_RATE);
  return `${riel.toLocaleString("en-US")}៛`;
}

function waitMinutes(order: Order) {
  const created = new Date(order.createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / 60000));
}

function orderType(order: Order) {
  return order.tableNo || order.table?.name ? "Dine-in" : "Takeout";
}

function tableLabel(order: Order) {
  const table = order.tableNo || order.table?.name;
  return table ? table.replace(/^table\s*/i, "T-") : "WALK";
}

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  const isToday = date.toDateString() === new Date().toDateString();
  const timeStr = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) return `Today, ${timeStr}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeStr}`;
}

function dateTimeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString();
}

function serverName(order: Order) {
  if ((order as any).user?.name) return (order as any).user.name;
  if ((order as any).userName) return (order as any).userName;
  if (order.createdBy?.name) return order.createdBy.name;

  if (order.notes) {
    const lines = order.notes.split("\n");
    const foundLine = lines.find((l) => l.toLowerCase().includes("by:") || l.toLowerCase().includes("cashier:"));
    if (foundLine) return foundLine.replace(/.*(by|cashier):\s*/i, "").trim();
  }

  if (typeof window !== "undefined") {
    try {
      const storedUser = localStorage.getItem("pos_user");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u && u.name) return u.name;
      }
    } catch {}
  }

  return "Chon (Cashier)";
}

function serverImage(order: Order): string | null {
  const userObj = (order as any).user || order.createdBy;
  let rawUrl = userObj?.imageUrl || userObj?.avatar || (order as any).userImageUrl || (order as any).userAvatar || "";

  if (!rawUrl && typeof window !== "undefined") {
    try {
      const storedUser = localStorage.getItem("pos_user");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        const name = serverName(order);
        if (u && (u.name === name || u.email === (order as any).userEmail) && u.imageUrl) {
          rawUrl = u.imageUrl;
        }
      }
    } catch {}
  }

  if (rawUrl) {
    if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
    const apiOrigin = process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, "")
      : "http://localhost:5000";
    return `${apiOrigin}${rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`}`;
  }

  return null;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function csvValue(value: string | number) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

let cachedOrders: Order[] | null = null;

export default function OrdersPage() {
  const language = useAppLanguage();
  const t = TEXT[language];
  const [theme] = useAppTheme();
  const [orders, setOrders] = useState<Order[]>(cachedOrders || []);
  const [filter, setFilter] = useState<OrderTab>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>("all");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [openActionId, setOpenActionId] = useState<number | null>(null);
  const [hoveredOrder, setHoveredOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [printSlipOrder, setPrintSlipOrder] = useState<Order | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    getSettings().then((res) => setAppSettings(res)).catch(() => undefined);
  }, []);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(!cachedOrders);
  const [message, setMessage] = useState("");
  useAutoDismiss(message, setMessage);

  const dark = theme === "dark";
  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const softSurface = dark ? "bg-[#232333]" : "bg-[#f5f5f9]";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-[#e5e7eb]";
  const textPrimary = dark ? "text-[#c9d4ea]" : "text-[#566a7f]";
  const textSecondary = dark ? "text-[#a1acb8]" : "text-[#a1acb8]";

  const cardClass = `rounded-2xl border ${borderCol} ${surface} shadow-none`;
  const inputClass = `rounded border ${borderCol} ${softSurface} ${textPrimary}`;

    useEffect(() => {
      cachedOrders = orders;
    }, [orders]);

    useEffect(() => {
      getOrders()
        .then((fetchedOrders) => {
          cachedOrders = fetchedOrders;
          setOrders(cachedOrders);
        })
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handleOrderCreated(newOrder: Order) {
      setOrders((current) => [newOrder, ...current.filter((o) => o.id !== newOrder.id)]);
    }

    function handleOrderUpdated(updatedOrder: Order) {
      setOrders((current) => current.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
    }

    socket.on("order:created", handleOrderCreated);
    socket.on("order:updated", handleOrderUpdated);

    return () => {
      socket.off("order:created", handleOrderCreated);
      socket.off("order:updated", handleOrderUpdated);
    };
  }, []);

  useEffect(() => {
    if (openActionId === null) return;

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (target.closest(".order-action-container")) {
        return;
      }

      setOpenActionId(null);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [openActionId]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    let rows = orders;

    if (filter === "active") {
      rows = rows.filter(
        (order) => !["completed", "cancelled"].includes(order.status),
      );
    } else if (filter !== "all") {
      rows = rows.filter((order) => order.status === filter);
    }

    if (statusFilter !== "all") {
      rows = rows.filter((order) => order.status === statusFilter);
    }

    if (typeFilter !== "all") {
      rows = rows.filter((order) =>
        typeFilter === "dine-in"
          ? orderType(order) === "Dine-in"
          : orderType(order) === "Takeout",
      );
    }

    if (query) {
      rows = rows.filter((order) => {
        const fields = [
          order.orderNumber,
          order.orderId,
          tableLabel(order),
          serverName(order),
          order.status,
        ];

        return fields.some((field) =>
          String(field || "").toLowerCase().includes(query),
        );
      });
    }

    return rows;
  }, [orders, filter, search, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);

  const visibleOrders = filteredOrders.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  const firstPageButton = Math.min(
    Math.max(1, currentPage - 2),
    Math.max(1, totalPages - 4),
  );

  const pageButtons = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => firstPageButton + index,
  );

  const firstVisible =
    filteredOrders.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;

  const lastVisible = Math.min(currentPage * rowsPerPage, filteredOrders.length);

  async function changeStatus(order: Order, status: OrderStatus) {
    setMessage("");
    setOpenActionId(null);

    const updatedPayload = { ...order, status };
    setOrders((current) =>
      current.map((entry) => (String(entry.id) === String(order.id) ? updatedPayload : entry)),
    );

    const socket = getSocket();
    if (socket) {
      socket.emit("order:updated", updatedPayload);
    }

    try {
      const updated = await updateOrderStatus(order.id, status);
      const finalPayload = updated ? { ...updated, status } : updatedPayload;
      setOrders((current) =>
        current.map((entry) => (String(entry.id) === String(finalPayload.id) ? finalPayload : entry)),
      );
      if (socket) {
        socket.emit("order:updated", finalPayload);
      }
    } catch {
      // Optimistic update already applied
    }
  }

  async function handlePayAndPrint(order: Order) {
    setOpenActionId(null);
    const updatedPayload = { ...order, status: "completed" as OrderStatus };
    setOrders((current) =>
      current.map((entry) => (String(entry.id) === String(order.id) ? updatedPayload : entry))
    );

    const socket = getSocket();
    if (socket) {
      socket.emit("order:updated", updatedPayload);
    }

    try {
      const updated = await updateOrderStatus(order.id, "completed");
      const finalPayload = updated ? { ...updated, status: "completed" as OrderStatus } : updatedPayload;
      setOrders((current) =>
        current.map((entry) => (String(entry.id) === String(finalPayload.id) ? finalPayload : entry))
      );
      if (socket) {
        socket.emit("order:updated", finalPayload);
      }
    } catch {}

    setSelectedOrder(null);
    setPrintSlipOrder(updatedPayload);
    setMessage(language === "km" ? "ទូទាត់ប្រាក់ និងចេញវិក្កយបត្ររួចរាល់!" : "Order paid and printed successfully!");
  }

  function resetFilters() {
    setStatusFilter("all");
    setTypeFilter("all");
    setSearch("");
    setPage(1);
  }

  function exportCsv() {
    const headers = [
      "Order ID",
      "Order Type",
      "Table",
      "By",
      "Time",
      "Status",
      "Total Amount",
    ];

    const rows = filteredOrders.map((order) => [
      order.orderNumber || order.orderId || "",
      orderType(order),
      tableLabel(order),
      serverName(order),
      dateTimeLabel(order.createdAt),
      order.status,
      Number(order.totalAmount || 0).toFixed(2),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => csvValue(value)).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const activeOrdersCount = orders.filter(
    (o) => !["completed", "cancelled"].includes(o.status),
  ).length;

  const completedTodayCount = orders.filter(
    (o) =>
      ["completed", "served"].includes(o.status) &&
      new Date(o.createdAt).toDateString() === new Date().toDateString(),
  ).length;

  const cancelledCount = orders.filter((o) => o.status === "cancelled").length;

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

  return (
    <main className={`flex-1 overflow-y-auto ${dark ? "bg-[#232333]" : "bg-[#f8faf9]"}`}>
        <div className="mx-auto w-full max-w-[1400px] px-4 py-4 lg:px-6">
          {/* Orders Page Header Title Block */}
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#55a060]/10 text-[#55a060]">
              <ReceiptText size={20} />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${dark ? "text-white" : "text-slate-900"} ${language === "km" ? "font-khmer" : ""}`}>
                {t.title}
              </h1>
              <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"} ${language === "km" ? "font-khmer" : ""}`}>
                {t.subtitle}
              </p>
            </div>
          </div>


          <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label={t.activeOrders}
              value={String(activeOrdersCount)}
              tone="blue"
              dark={dark}
              Icon={Clock}
            />

            <SummaryCard
              label={t.completedToday}
              value={String(completedTodayCount)}
              tone="green"
              dark={dark}
              Icon={CheckCircle2}
            />

            <SummaryCard
              label={t.cancelled}
              value={String(cancelledCount)}
              tone="red"
              dark={dark}
              Icon={X}
            />

            <SummaryCard
              label={t.totalRevenue}
              value={money(totalRevenue)}
              tone="purple"
              dark={dark}
              Icon={DollarSign}
            />
          </section>

          <section className={`mb-4 overflow-hidden ${cardClass}`}>
            <div className={`border-b px-4 pt-4 ${borderCol}`}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex flex-wrap gap-5">
                    {orderTabs.map((tab) => (
                      <button
                        key={tab.value}
                        onClick={() => {
                          setFilter(tab.value);
                          setPage(1);
                        }}
                        className={`border-b-2 px-1 pb-3 text-xs font-bold ${
                          filter === tab.value
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-slate-500 hover:text-blue-600"
                        }`}
                      >
                        {t.tabs[tab.value]}
                      </button>
                    ))}
                  </div>

                  <span className="mb-3 rounded-full bg-[#0F522B]/10 px-3 py-1 text-[11px] font-black text-[#0F522B] whitespace-nowrap transition-all duration-200 hover:scale-105 hover:bg-[#0F522B]/20 cursor-default">
                    {filteredOrders.length} {t.orders}
                  </span>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 pb-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t.searchPlaceholder}
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                      }}
                      className={`h-9 w-48 sm:w-56 rounded border px-3.5 text-xs outline-none placeholder-[#b4bdc6] focus:border-[#0F522B] transition-all ${
                        dark ? "border-[#4e4f6e] bg-[#232333] text-slate-100" : "border-[#d9dee3] bg-white text-[#566a7f]"
                      }`}
                    />
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setShowFilters((value) => !value)}
                      className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition-all ${
                        showFilters || statusFilter !== "all" || typeFilter !== "all"
                          ? "border-[#0F522B] bg-[#E8F5ED] text-[#0F522B]"
                          : `${borderCol} ${softSurface} ${textPrimary}`
                      }`}
                    >
                      <Filter size={14} />
                      {t.filter}
                      {(statusFilter !== "all" || typeFilter !== "all") && (
                        <span className="h-2 w-2 rounded-full bg-[#0F522B]" />
                      )}
                    </button>

                    {/* FLOATING POPOVER FILTER CARD */}
                    {showFilters && (
                      <div
                        className={`absolute right-0 top-10 z-30 w-52 rounded-xl border p-2.5 shadow-lg animate-[printerScaleIn_150ms_ease-out] ${
                          dark ? "border-[#4e4f6e] bg-[#1f2130] text-slate-100" : "border-slate-200/90 bg-white text-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t.filter}</span>
                          <button
                            onClick={() => setShowFilters(false)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
                          >
                            <X size={13} />
                          </button>
                        </div>

                        <div className="space-y-2 text-[11px]">
                          <div>
                            <label className="mb-0.5 block font-semibold text-slate-400 uppercase text-[9px] tracking-wider">
                              {t.status}
                            </label>
                            <select
                              value={statusFilter}
                              onChange={(event) => {
                                setStatusFilter(event.target.value as "all" | OrderStatus);
                                setPage(1);
                              }}
                              className={`h-7.5 w-full rounded-lg border px-2 text-[11px] font-medium outline-none cursor-pointer ${
                                dark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                              }`}
                            >
                              <option value="all">{t.allStatus}</option>
                              {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-0.5 block font-semibold text-slate-400 uppercase text-[9px] tracking-wider">
                              {t.orderType}
                            </label>
                            <select
                              value={typeFilter}
                              onChange={(event) => {
                                setTypeFilter(event.target.value as OrderTypeFilter);
                                setPage(1);
                              }}
                              className={`h-7.5 w-full rounded-lg border px-2 text-[11px] font-medium outline-none cursor-pointer ${
                                dark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                              }`}
                            >
                              <option value="all">{t.allTypes}</option>
                              <option value="dine-in">{t.dineIn}</option>
                              <option value="takeout">{t.takeout}</option>
                            </select>
                          </div>

                          {(statusFilter !== "all" || typeFilter !== "all") && (
                            <button
                              onClick={() => {
                                resetFilters();
                                setShowFilters(false);
                              }}
                              className="flex w-full items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100 transition-all mt-1"
                            >
                              <X size={12} />
                              {t.reset}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={exportCsv}
                    disabled={filteredOrders.length === 0}
                    className={`inline-flex h-9 items-center gap-2 rounded border px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${borderCol} ${softSurface} ${textPrimary}`}
                  >
                    <Download size={14} />
                    {t.export}
                  </button>
                </div>
              </div>
            </div>

            {/* Orders Table Container (Horizontally scrollable on mobile like Admin Recent Orders) */}
            <div className="w-full overflow-x-auto min-h-[410px] no-scrollbar">
              <table className="w-full text-left text-sm min-w-[760px]">
                <thead
                  className={`text-[11px] uppercase tracking-wide ${
                    dark ? "bg-slate-800 text-slate-400" : "bg-slate-50 text-slate-500"
                  }`}
                >
                  <tr>
                    <th className="w-[22%] px-4 py-3 font-bold">{t.headers.orderId}</th>
                    <th className="w-[10%] px-2 py-3 text-center font-bold">{t.headers.table}</th>
                    <th className="w-[18%] px-3 py-3 font-bold">{t.headers.server}</th>
                    <th className="w-[14%] px-3 py-3 text-center font-bold">{t.headers.time}</th>
                    <th className="w-[14%] px-3 py-3 text-center font-bold">{t.headers.status}</th>
                    <th className="w-[15%] px-3 py-3 text-right font-bold">{t.headers.total}</th>
                    <th className="w-[7%] px-2 py-3 text-center font-bold">{t.headers.actions}</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className={`p-8 text-center text-xs ${textSecondary}`}>
                        {t.loading}
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={`p-8 text-center text-xs ${textSecondary}`}>
                        {t.empty}
                      </td>
                    </tr>
                  ) : (
                    visibleOrders.map((order, index) => {
                      const staff = serverName(order);

                      return (
                        <tr
                          key={order.id}
                          onClick={() => setSelectedOrder(order)}
                          className={`border-t h-14 cursor-pointer transition-colors ${
                            dark
                              ? "border-slate-700/70 hover:bg-slate-800/60"
                              : "border-slate-100 hover:bg-emerald-50/40"
                          }`}
                          title="Click to view order details & dishes"
                        >
                          <td className="relative px-4 py-3">
                            <div
                              onMouseEnter={() => setHoveredOrder(order)}
                              onMouseLeave={() => setHoveredOrder(null)}
                              className="text-left group cursor-default inline-block"
                            >
                              <div className={`text-sm font-bold tracking-tight group-hover:text-[#0F522B] transition-colors ${textPrimary}`}>
                                {formatShortOrderNo(order)}
                              </div>
                              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                {orderType(order)}
                              </div>
                            </div>

                            {/* FLOATING HOVER PREVIEW CARD (POPOVER) */}
                            {hoveredOrder?.id === order.id && (
                              <div className={`pointer-events-none absolute left-20 z-40 w-72 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#1f2130] p-4 shadow-2xl animate-[printerScaleIn_150ms_ease-out] ${
                                index > 2 ? "bottom-2" : "top-2"
                              }`}>
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-2.5">
                                  <div>
                                    <div className="font-black text-xs text-slate-900 dark:text-white">{order.orderNumber || order.orderId}</div>
                                    <div className="text-[10px] text-slate-400 font-medium">{orderType(order)}</div>
                                  </div>
                                  <span className="rounded-lg bg-[#E8F5ED] px-2.5 py-1 text-[11px] font-extrabold text-[#0F522B]">
                                    {tableLabel(order)}
                                  </span>
                                </div>

                                {order.items && order.items.length > 0 && (
                                  <div className="space-y-1.5 mb-3 max-h-36 overflow-hidden">
                                    {order.items.slice(0, 3).map((item: any, idx: number) => (
                                      <div key={idx} className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        <span className="truncate max-w-[160px]">{item.quantity}x {item.product?.name || item.name}</span>
                                        <span className="font-bold text-[#0F522B]">{money(item.totalPrice)}</span>
                                      </div>
                                    ))}
                                    {order.items.length > 3 && (
                                      <div className="text-[10px] text-slate-400 font-bold italic">+ {order.items.length - 3} more item(s)</div>
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5 text-xs font-black">
                                  <span>Total:</span>
                                  <span className="text-[#0F522B] dark:text-emerald-400">{money(order.totalAmount)} ({moneyRiel(order.totalAmount)})</span>
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="px-2 py-3 text-center">
                            <div
                              onMouseEnter={() => setHoveredOrder(order)}
                              onMouseLeave={() => setHoveredOrder(null)}
                              className="cursor-default inline-flex justify-center"
                            >
                              <span
                                className={`inline-flex min-w-12 justify-center rounded px-2.5 py-1 text-[11px] font-bold transition-all ${
                                  tableLabel(order) === "WALK"
                                    ? dark
                                      ? "bg-slate-800 text-slate-300"
                                      : "bg-slate-100 text-slate-600"
                                    : "bg-blue-50 text-blue-700"
                                }`}
                              >
                                {tableLabel(order)}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {serverImage(order) ? (
                                <img
                                  src={serverImage(order)!}
                                  alt={staff}
                                  className="h-7 w-7 rounded-full object-cover ring-1 ring-emerald-600/20 shadow-xs shrink-0"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = "none";
                                    const next = e.currentTarget.nextElementSibling as HTMLElement | null;
                                    if (next) next.style.display = "flex";
                                  }}
                                />
                              ) : null}

                              <div
                                style={{ display: serverImage(order) ? "none" : "flex" }}
                                className={`h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-xs ${
                                  index % 4 === 0
                                    ? "bg-[#0F522B]"
                                    : index % 4 === 1
                                      ? "bg-slate-700"
                                      : index % 4 === 2
                                        ? "bg-emerald-600"
                                        : "bg-amber-600"
                                }`}
                              >
                                {initials(staff)}
                              </div>

                              <span className={`max-w-32 truncate text-xs font-semibold ${textPrimary}`}>
                                {staff}
                              </span>
                            </div>
                          </td>

                          <td className={`px-3 py-3 text-center text-xs font-semibold ${textPrimary}`}>
                            {timeLabel(order.createdAt)}
                          </td>

                          <td className="px-3 py-3 text-center">
                            <OrderStatusBadge status={order.status} />
                          </td>

                          <td className="px-3 py-3 text-right">
                            <div className={`text-sm font-black leading-none ${textPrimary}`}>{money(order.totalAmount)}</div>
                            <div className="mt-1">
                              <span className="inline-block rounded-md bg-[#E8F5ED] dark:bg-emerald-950/70 px-1.5 py-0.5 text-[10px] font-extrabold text-[#0F522B] dark:text-emerald-400">
                                {moneyRiel(order.totalAmount)}
                              </span>
                            </div>
                          </td>

                          <td 
                            onClick={(e) => e.stopPropagation()} 
                              className="relative px-2 py-3 text-center order-action-container"
                          >
                            <button
                              onClick={() =>
                                setOpenActionId((current) =>
                                  current === order.id ? null : order.id,
                                )
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded text-blue-600 hover:bg-blue-50"
                              aria-label="Open order actions"
                            >
                              <MoreVertical size={17} />
                            </button>

                            {openActionId === order.id && (
                              <div
                                className={`absolute right-4 z-30 w-44 rounded-2xl border p-1.5 text-left shadow-xl animate-[printerScaleIn_150ms_ease-out] ${
                                  dark
                                    ? "border-[#4e4f6e] bg-[#1f2130] text-slate-100"
                                    : "border-slate-200/90 bg-white text-slate-800"
                                } ${index >= 3 && index >= visibleOrders.length - 2 ? "bottom-10" : "top-10"}`}
                              >
                                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                                  {t.changeStatus}
                                </div>
                                {statusOptions.map((status) => {
                                  const isActive = order.status === status;
                                  const dotColor =
                                    status === "pending"
                                      ? "bg-amber-500"
                                      : status === "preparing"
                                      ? "bg-blue-500"
                                      : status === "completed"
                                      ? "bg-emerald-500"
                                      : "bg-rose-500";

                                  return (
                                    <button
                                      key={status}
                                      onClick={() => {
                                        changeStatus(order, status);
                                        setOpenActionId(null);
                                      }}
                                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold capitalize rounded-xl transition-all cursor-pointer ${
                                        isActive
                                          ? "bg-[#696cff]/10 text-[#696cff] font-bold"
                                          : dark
                                          ? "text-slate-200 hover:bg-[#2b2c40]"
                                          : "text-slate-700 hover:bg-slate-50"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
                                        <span>{status}</span>
                                      </div>
                                      {isActive && <CheckCircle2 size={13} className="text-[#696cff] shrink-0" />}
                                    </button>
                                  );
                                })}

                                <div className="border-t border-slate-100 dark:border-slate-800/80 my-1 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (order.status !== "completed") {
                                        handlePayAndPrint(order);
                                      } else {
                                        setOpenActionId(null);
                                        setPrintSlipOrder(order);
                                      }
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-all cursor-pointer"
                                  >
                                    <Printer size={14} />
                                    <span>{order.status === "completed" ? (language === "km" ? "ព្រីនវិក្កយបត្រ" : "Print Receipt") : (language === "km" ? "គិតលុយ & ព្រីន" : "Pay & Print")}</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className={`text-xs ${textSecondary}`}>
                {t.showing}{" "}
                <span className={`font-bold ${textPrimary}`}>
                  {firstVisible} {t.to} {lastVisible}
                </span>{" "}
                {t.of} {filteredOrders.length} {t.orders}
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage === 1}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${borderCol} ${softSurface} ${textSecondary} hover:bg-slate-100 dark:hover:bg-[#34354e]`}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={15} />
                </button>

                {pageButtons.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    onClick={() => setPage(pageNumber)}
                    className={`h-8 w-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      currentPage === pageNumber
                        ? "bg-[#55a060] text-white shadow-xs shadow-[#55a060]/40"
                        : `${borderCol} ${softSurface} ${textSecondary} border hover:bg-[#55a060]/10 hover:text-[#55a060] hover:border-[#55a060]/30`
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${borderCol} ${softSurface} ${textSecondary} hover:bg-slate-100 dark:hover:bg-[#34354e]`}
                  aria-label="Next page"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </section>

        </div>

        {/* ORDER QUICK VIEW DETAILS MODAL */}
        {selectedOrder && (
          <div
            onClick={() => setSelectedOrder(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[1.5px] p-4 animate-[usersPageIn_200ms_ease-out]"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg overflow-hidden rounded-2xl border shadow-2xl transition-all ${
                dark ? "border-slate-700 bg-[#1f2130] text-slate-100" : "border-slate-200 bg-white text-slate-800"
              }`}
            >
              {/* Modal Header */}
              <div className={`flex items-center justify-between border-b px-6 py-4 ${dark ? "border-slate-800 bg-[#252838]" : "border-slate-100 bg-slate-50/80"}`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#55a060] text-white font-bold shadow-md shadow-[#55a060]/20">
                    <ReceiptText size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-medium tracking-normal text-slate-800 dark:text-slate-100">
                      Order {selectedOrder.orderNumber || selectedOrder.orderId}
                    </h3>
                    <p className="text-xs text-slate-400 font-normal">
                      {orderType(selectedOrder)} • Table: <span className="text-[#55a060] dark:text-[#55a060] font-semibold">{tableLabel(selectedOrder)}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body: Dishes & Info */}
              <div className="max-h-[420px] overflow-y-auto p-6 space-y-4">
                {/* Order Status & Time */}
                <div className={`flex items-center justify-between rounded-xl p-3.5 border ${dark ? "border-slate-800 bg-[#252838]" : "border-slate-100 bg-slate-50"}`}>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Status</span>
                    <OrderStatusBadge status={selectedOrder.status} />
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Created</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{dateTimeLabel(selectedOrder.createdAt)}</span>
                  </div>
                </div>

                {/* Staff / Server Info */}
                <div className={`flex items-center justify-between rounded-xl p-3 border ${dark ? "border-slate-800 bg-[#252838]" : "border-slate-100 bg-slate-50"}`}>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Server / Order Taken By</span>
                  <div className="flex items-center gap-2">
                    {serverImage(selectedOrder) ? (
                      <img
                        src={serverImage(selectedOrder)!}
                        alt={serverName(selectedOrder)}
                        className="h-6 w-6 rounded-full object-cover ring-1 ring-emerald-600/20 shadow-xs shrink-0"
                      />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0F522B] text-[9px] font-bold text-white shadow-xs">
                        {initials(serverName(selectedOrder))}
                      </div>
                    )}
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {serverName(selectedOrder)}
                    </span>
                  </div>
                </div>

                {/* Ordered Dishes List */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                    Ordered Dishes ({selectedOrder.items?.length || 0})
                  </h4>
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    <div className="space-y-2">
                      {selectedOrder.items.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between rounded-xl p-3 border ${
                            dark ? "border-slate-800 bg-[#252838]" : "border-slate-200/60 bg-slate-50/60"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#55a060]/10 text-[#55a060] dark:text-[#55a060] font-bold text-xs">
                              {item.quantity}x
                            </span>
                            <div>
                              <div className="text-xs font-medium text-slate-800 dark:text-slate-100 font-khmer">{item.product?.name || item.name}</div>
                              {item.notes && <div className="text-[11px] text-amber-600 font-medium">Note: {item.notes}</div>}
                            </div>
                          </div>
                          <div className="text-xs font-bold text-[#55a060] dark:text-[#55a060]">
                            {money(item.totalPrice || item.price * item.quantity)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400 font-medium">No dish items recorded.</div>
                  )}
                </div>
              </div>

              {/* Modal Footer: Total & Actions */}
              <div className={`flex items-center justify-between border-t px-6 py-4 ${dark ? "border-slate-800 bg-[#252838]" : "border-slate-100 bg-slate-50"}`}>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Amount</span>
                  <div className="text-lg font-bold text-[#55a060] dark:text-[#55a060]">
                    {money(selectedOrder.totalAmount)} <span className="text-xs font-medium text-slate-400">({moneyRiel(selectedOrder.totalAmount)})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedOrder.status !== "completed" ? (
                    <button
                      type="button"
                      onClick={() => handlePayAndPrint(selectedOrder)}
                      className="flex h-9 items-center gap-1.5 rounded-xl bg-[#55a060] hover:bg-[#439150] px-4 text-xs font-bold text-white transition-all shadow-md shadow-[#55a060]/20 cursor-pointer active:scale-95"
                    >
                      <Banknote size={15} />
                      {language === "km" ? "ទូទាត់ប្រាក់ & ព្រីនវិក្កយបត្រ" : "Pay & Print Receipt"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPrintSlipOrder(selectedOrder);
                        setSelectedOrder(null);
                      }}
                      className="flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 text-xs font-bold text-white transition-all shadow-md shadow-indigo-600/20 cursor-pointer active:scale-95"
                    >
                      <Printer size={15} />
                      {language === "km" ? "ព្រីនវិក្កយបត្រ" : "Print Receipt"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className={`h-9 rounded-xl border px-4 text-xs font-semibold transition-colors cursor-pointer ${
                      dark ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {language === "km" ? "បិទ" : "Close"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Printable Receipt Modal */}
        {printSlipOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[1px] print:p-0 print:bg-white p-4">
            <div className="w-full max-w-[380px] overflow-hidden rounded-2xl bg-white p-5 shadow-2xl animate-[dashboardPageIn_200ms_ease-out] print:shadow-none print:w-full print:max-w-none print:p-0">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 print:hidden">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">PRINT SLIP PREVIEW</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 rounded-lg bg-[#55a060] hover:bg-[#46894f] px-3 py-1.5 text-xs font-bold text-white transition-all cursor-pointer shadow-xs"
                  >
                    <Printer size={14} /> {language === "km" ? "ព្រីន" : "Print"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintSlipOrder(null)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              <div id="thermal-print-area" className="text-xs text-slate-800 leading-normal font-sans font-khmer">
                <div className="text-center">
                  {appSettings?.restaurantImageUrl ? (
                    <img loading="lazy" src={resolveImageUrl(appSettings.restaurantImageUrl)} alt="Logo" className="h-12 w-12 object-contain mx-auto mb-1.5" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F522B] text-white font-bold text-sm mx-auto mb-1.5">
                      {(appSettings?.restaurantName || "POS").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <h2 className="text-sm font-bold tracking-tight text-slate-800 font-khmer">
                    {appSettings?.restaurantName || "ផ្ទះកន្តែយ POS"}
                  </h2>
                  {appSettings?.address && (
                    <p className="text-[11px] text-slate-500 font-normal leading-tight mt-0.5">
                      {appSettings.address}
                    </p>
                  )}
                  {(appSettings?.restaurantPhone || appSettings?.restaurantEmail) && (
                    <p className="text-[11px] text-slate-500 font-normal leading-tight">
                      {appSettings?.restaurantPhone ? `Tel: ${appSettings.restaurantPhone}` : ""}
                      {appSettings?.restaurantPhone && appSettings?.restaurantEmail ? " | " : ""}
                      {appSettings?.restaurantEmail ? `Email: ${appSettings.restaurantEmail}` : ""}
                    </p>
                  )}
                  <div className="mt-2 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-md inline-block">
                    {printSlipOrder.table?.name ? `Table ${printSlipOrder.table.name}` : "WALKIN"}
                  </div>
                </div>

                <div className="mt-3.5 space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Order Type:</span>
                    <span className="font-semibold text-slate-800">{printSlipOrder.orderType || "Dine-In"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Receipt No.:</span>
                    <span className="font-semibold text-slate-800">{printSlipOrder.orderNumber || `#${printSlipOrder.id}`}</span>
                  </div>
                  <div className="text-slate-400 text-[11px] text-right mt-0.5">
                    {dateTimeLabel(printSlipOrder.createdAt)}
                  </div>
                </div>

                <div className="my-2.5 border-b border-dashed border-slate-200" />

                <div className="space-y-2">
                  {printSlipOrder.items?.map((item: any, idx: number) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between items-baseline text-xs font-medium text-slate-800">
                        <span className="flex-1 pr-2 leading-snug">{item.product?.name || item.name}</span>
                        <span className="font-semibold text-slate-900">{money(item.totalPrice || item.price * item.quantity)}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.quantity}x {money(item.price || item.unitPrice || 0)}
                      </div>
                      {item.notes && (
                        <div className="text-[10.5px] text-amber-700 italic pl-1.5 border-l border-amber-300 mt-0.5">
                          Note: {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="my-2.5 border-b border-dashed border-slate-200" />

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-800">{money(printSlipOrder.subtotal || printSlipOrder.totalAmount)}</span>
                  </div>
                  {Number(printSlipOrder.discountAmount) > 0 && (
                    <div className="flex justify-between items-center text-emerald-600">
                      <span>Discount:</span>
                      <span className="font-semibold">-{money(printSlipOrder.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 text-sm font-bold border-t border-slate-200 text-slate-800 mt-1">
                    <span>Total (PAID):</span>
                    <span className="text-base text-[#55a060] font-bold">{money(printSlipOrder.totalAmount)}</span>
                  </div>
                  <div className="text-right text-[10.5px] text-slate-500 font-bold mt-0.5">
                    ~ {moneyRiel(printSlipOrder.totalAmount)}
                  </div>
                </div>

                <div className="my-3 border-b border-dashed border-slate-200" />
                <div className="text-center text-xs font-normal text-slate-500 space-y-0.5">
                  <p>{appSettings?.receiptFooter || "Thanks for visit. Come again"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes usersPageIn {
            from {
              opacity: 0;
              transform: translateY(15px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes printerFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes printerScaleIn {
            from {
              opacity: 0;
              transform: scale(0.96) translateY(8px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
        `}</style>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  dark,
  Icon,
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "red" | "purple";
  dark: boolean;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  const iconTones = {
    blue: dark ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600",
    green: dark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600",
    red: dark ? "bg-rose-500/10 text-rose-400" : "bg-rose-50 text-rose-600",
    purple: dark ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-600",
  };

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 shadow-none transition-all flex items-center justify-between ${
        dark ? "border-[#4e4f6e] bg-[#2b2c40]" : "border-slate-200/80 bg-white"
      }`}
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

      <div className={`p-2.5 rounded-xl shrink-0 ${iconTones[tone] || iconTones.blue}`}>
        <Icon size={20} />
      </div>
    </div>
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
