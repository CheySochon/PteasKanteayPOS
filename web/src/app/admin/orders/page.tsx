"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  MoreVertical,
  ReceiptText,
  ShoppingBag,
  Utensils,
  X,
} from "lucide-react";
import TopBar from "../../../components/TopBar";
import OrderStatusBadge from "../../../components/OrderStatusBadge";
import { getOrders, updateOrderStatus } from "../../../lib/api";
import { useAppLanguage } from "../../../lib/language";
import { useAppTheme } from "../../../lib/theme";
import type { Order, OrderStatus } from "../../../lib/types";
import { useAutoDismiss } from "../../../lib/useAutoDismiss";

const statusOptions: OrderStatus[] = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "served",
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
      server: "Server",
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

function money(value: number | string) {
  return `$${Number(value || 0).toFixed(2)}`;
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

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dateTimeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString();
}

function serverName(order: Order) {
  return order.createdBy?.name || order.notes?.split("\n")[0] || "Staff User";
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

export default function OrdersPage() {
  const language = useAppLanguage();
  const t = TEXT[language];
  const [theme] = useAppTheme();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderTab>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>("all");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [openActionId, setOpenActionId] = useState<number | null>(null);
  const [viewOrderModal, setViewOrderModal] = useState<Order | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  useAutoDismiss(message, setMessage);

  const dark = theme === "dark";
  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const softSurface = dark ? "bg-[#232333]" : "bg-[#f5f5f9]";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-[#e5e7eb]";
  const textPrimary = dark ? "text-[#c9d4ea]" : "text-[#566a7f]";
  const textSecondary = dark ? "text-[#a1acb8]" : "text-[#a1acb8]";

  const cardClass = `rounded border ${borderCol} ${surface} shadow-sm`;
  const inputClass = `rounded border ${borderCol} ${softSurface} ${textPrimary}`;

  useEffect(() => {
    getOrders()
      .then(setOrders)
      .catch((err) => setMessage(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!viewOrderModal) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setViewOrderModal(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewOrderModal]);

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

    try {
      const updated = await updateOrderStatus(order.id, status);

      setOrders((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );

      setOpenActionId(null);
    } catch (err) {
      setMessage(
        err instanceof Error
          ? `${err.message}. Login as Admin, Cashier, or Staff to update orders.`
          : "Unable to update order",
      );
    }
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
      "Server",
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
      o.status === "completed" &&
      new Date(o.createdAt).toDateString() === new Date().toDateString(),
  ).length;

  const cancelledCount = orders.filter((o) => o.status === "cancelled").length;

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

  return (
    <main className="flex-1 overflow-y-auto">
        <TopBar
          title={t.title}
          subtitle={t.subtitle}
          language={language}
          onLanguageChange={(nextLanguage) => {
            localStorage.setItem("pos_language", nextLanguage);
            window.dispatchEvent(new Event("pos-language-change"));
          }}
          notifications={[]}
          dark={dark}
        />

        <div className="mx-auto w-full max-w-[1400px] px-4 py-4 lg:px-6 animate-[usersPageIn_520ms_cubic-bezier(0.16,1,0.3,1)_both]">
          {message && (
            <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
              {message}
            </div>
          )}

          <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label={t.activeOrders}
              value={String(activeOrdersCount)}
              note={`+${activeOrdersCount > 0 ? "5%" : "0%"} ${t.fromLastHour}`}
              tone="blue"
              dark={dark}
              liveLabel={t.live}
            />

            <SummaryCard
              label={t.completedToday}
              value={String(completedTodayCount)}
              note={`~-2% ${t.fromYesterday}`}
              tone="green"
              dark={dark}
              liveLabel={t.live}
            />

            <SummaryCard
              label={t.cancelled}
              value={String(cancelledCount)}
              note={`1% ${t.cancellationRate}`}
              tone="red"
              dark={dark}
              liveLabel={t.live}
            />

            <SummaryCard
              label={t.totalRevenue}
              value={money(totalRevenue)}
              note={`+12% ${t.vsLastShift}`}
              tone="purple"
              dark={dark}
              liveLabel={t.live}
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

                  <span className="mb-3 rounded-full bg-[#696cff]/10 px-3 py-1 text-[11px] font-black text-[#696cff] whitespace-nowrap transition-all duration-200 hover:scale-105 hover:bg-[#696cff]/20 cursor-default">
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
                      className={`h-9 w-48 sm:w-56 rounded border px-3.5 text-xs outline-none placeholder-[#b4bdc6] focus:border-[#696cff] transition-all ${
                        dark ? "border-[#4e4f6e] bg-[#232333] text-slate-100" : "border-[#d9dee3] bg-white text-[#566a7f]"
                      }`}
                    />
                  </div>

                  <button
                    onClick={() => setShowFilters((value) => !value)}
                    className={`inline-flex h-9 items-center gap-2 rounded border px-3 text-xs font-semibold ${
                      showFilters ||
                      statusFilter !== "all" ||
                      typeFilter !== "all"
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : `${borderCol} ${softSurface} ${textPrimary}`
                    }`}
                  >
                    <Filter size={14} />
                    {t.filter}
                  </button>

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

            {showFilters && (
              <div
                className={`grid gap-3 border-b px-4 py-4 md:grid-cols-[180px_180px_auto] justify-end ${borderCol}`}
              >

                <label className="block">
                  <span className={`mb-1 block text-[11px] font-bold uppercase ${textSecondary}`}>
                    {t.status}
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value as "all" | OrderStatus);
                      setPage(1);
                    }}
                    className={`h-10 w-full px-3 text-sm font-semibold outline-none focus:border-blue-300 ${inputClass}`}
                  >
                    <option value="all">{t.allStatus}</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className={`mb-1 block text-[11px] font-bold uppercase ${textSecondary}`}>
                    {t.orderType}
                  </span>
                  <select
                    value={typeFilter}
                    onChange={(event) => {
                      setTypeFilter(event.target.value as OrderTypeFilter);
                      setPage(1);
                    }}
                    className={`h-10 w-full px-3 text-sm font-semibold outline-none focus:border-blue-300 ${inputClass}`}
                  >
                    <option value="all">{t.allTypes}</option>
                    <option value="dine-in">{t.dineIn}</option>
                    <option value="takeout">{t.takeout}</option>
                  </select>
                </label>

                <div className="flex items-end">
                  <button
                    onClick={resetFilters}
                    className={`inline-flex h-10 items-center gap-2 rounded border px-3 text-xs font-semibold ${borderCol} ${softSurface} ${textPrimary}`}
                  >
                    <X size={14} />
                    {t.reset}
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto min-h-[380px]">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead
                  className={`text-[11px] uppercase tracking-wide ${
                    dark ? "bg-slate-800 text-slate-400" : "bg-slate-50 text-slate-500"
                  }`}
                >
                  <tr>
                    <th className="px-4 py-3 font-bold">{t.headers.orderId}</th>
                    <th className="px-4 py-3 font-bold">{t.headers.table}</th>
                    <th className="px-4 py-3 font-bold">{t.headers.server}</th>
                    <th className="px-4 py-3 font-bold">{t.headers.time}</th>
                    <th className="px-4 py-3 font-bold">{t.headers.status}</th>
                    <th className="px-4 py-3 text-right font-bold">{t.headers.total}</th>
                    <th className="px-4 py-3 text-right font-bold">{t.headers.actions}</th>
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
                          className={`border-t ${
                            dark
                              ? "border-slate-700/70 hover:bg-slate-800/50"
                              : "border-slate-100 hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setViewOrderModal(order)}
                              className="text-left group cursor-pointer"
                              title={t.viewDetails}
                            >
                              <div className={`text-sm font-bold leading-tight group-hover:text-[#696cff] transition-colors ${textPrimary}`}>
                                {order.orderNumber || order.orderId}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {orderType(order)}
                              </div>
                            </button>
                          </td>

                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setViewOrderModal(order)}
                              className="cursor-pointer"
                              title={t.viewDetails}
                            >
                              <span
                                className={`inline-flex min-w-12 justify-center rounded px-2 py-1 text-[11px] font-bold hover:scale-105 transition-all ${
                                  tableLabel(order) === "WALK"
                                    ? dark
                                      ? "bg-slate-800 text-slate-300"
                                      : "bg-slate-100 text-slate-600"
                                    : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                }`}
                              >
                                {tableLabel(order)}
                              </span>
                            </button>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                                  index % 3 === 0
                                    ? "bg-amber-600"
                                    : index % 3 === 1
                                      ? "bg-slate-700"
                                      : "bg-emerald-600"
                                }`}
                              >
                                {initials(staff)}
                              </div>

                              <span className={`max-w-32 truncate text-xs font-medium ${textPrimary}`}>
                                {staff}
                              </span>
                            </div>
                          </td>

                          <td className={`px-4 py-3 text-xs font-medium ${textPrimary}`}>
                            {timeLabel(order.createdAt)}
                          </td>

                          <td className="px-4 py-3">
                            <OrderStatusBadge status={order.status} />
                          </td>

                          <td className={`px-4 py-3 text-right text-sm font-bold ${textPrimary}`}>
                            {money(order.totalAmount)}
                          </td>

                          <td className="relative px-4 py-3 text-right order-action-container">
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
                                className={`absolute right-4 z-20 w-48 overflow-hidden rounded border py-1 text-left shadow-lg ${
                                  dark
                                    ? "border-slate-700 bg-[#111827]"
                                    : "border-slate-200 bg-white"
                                } ${index >= 3 && index >= visibleOrders.length - 2 ? "bottom-10" : "top-10"}`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewOrderModal(order);
                                    setOpenActionId(null);
                                  }}
                                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold border-b transition-colors ${
                                    dark
                                      ? "border-slate-700 text-[#696cff] hover:bg-slate-800"
                                      : "border-slate-100 text-[#696cff] hover:bg-blue-50"
                                  }`}
                                >
                                  <Eye size={14} />
                                  {t.viewDetails}
                                </button>

                                <div
                                  className={`border-b px-3 py-1.5 text-[10px] font-bold uppercase ${
                                    dark
                                      ? "border-slate-700 text-slate-400"
                                      : "border-slate-100 text-slate-400"
                                  }`}
                                >
                                  {t.changeStatus}
                                </div>

                                {statusOptions.map((status) => (
                                  <button
                                    key={status}
                                    onClick={() => changeStatus(order, status)}
                                    disabled={order.status === status}
                                    className={`block w-full px-3 py-2 text-left text-xs font-semibold capitalize ${
                                      order.status === status
                                        ? "bg-[#696cff] text-white"
                                        : dark
                                          ? "text-slate-200 hover:bg-slate-800"
                                          : "text-slate-700 hover:bg-slate-50"
                                    }`}
                                  >
                                    {status}
                                  </button>
                                ))}
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

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage === 1}
                  className={`flex h-8 w-8 items-center justify-center rounded border disabled:opacity-40 ${borderCol} ${softSurface} ${textSecondary}`}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>

                {pageButtons.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    onClick={() => setPage(pageNumber)}
                    className={`h-8 w-8 rounded text-xs font-semibold ${
                      currentPage === pageNumber
                        ? "bg-[#696cff] text-white"
                        : `${borderCol} ${softSurface} ${textSecondary} border hover:text-blue-600`
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={currentPage === totalPages}
                  className={`flex h-8 w-8 items-center justify-center rounded border disabled:opacity-40 ${borderCol} ${softSurface} ${textSecondary}`}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>

        </div>

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

        {viewOrderModal && (
          <div
            onClick={() => setViewOrderModal(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-[printerFadeIn_200ms_ease-out_both] cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg overflow-hidden rounded-2xl border shadow-2xl animate-[printerScaleIn_250ms_cubic-bezier(0.16,1,0.3,1)_both] cursor-default ${dark ? "bg-[#1f2130] border-[#383a50] text-slate-100" : "bg-white border-slate-200 text-slate-800"}`}
            >
              {/* Modal Header */}
              <div className={`flex items-center justify-between border-b px-6 py-4 ${dark ? "border-[#383a50] bg-[#252836]" : "border-slate-100 bg-slate-50/90"}`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#696cff]/10 text-[#696cff]">
                    <ReceiptText size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black tracking-tight">{viewOrderModal.orderNumber || viewOrderModal.orderId}</h3>
                      <span className={`inline-flex rounded-md px-2.5 py-0.5 text-xs font-bold ${tableLabel(viewOrderModal) === "WALK" ? "bg-slate-200 text-slate-700" : "bg-blue-100 text-blue-700"}`}>
                        {tableLabel(viewOrderModal)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">{dateTimeLabel(viewOrderModal.createdAt)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewOrderModal(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/50 hover:text-slate-600 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="max-h-[68vh] overflow-y-auto p-6 space-y-4">
                {/* Clean Summary Row */}
                <div className={`grid grid-cols-3 gap-2.5 rounded-xl border p-3 text-xs ${dark ? "border-[#383a50] bg-[#171923]" : "border-slate-100 bg-slate-50/70"}`}>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">{language === "km" ? "តុ / ប្រភេទ" : "Table / Type"}</span>
                    <span className="font-bold truncate block">{tableLabel(viewOrderModal)} ({orderType(viewOrderModal)})</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">{language === "km" ? "អ្នកកុម្ម៉ង់" : "Orderer"}</span>
                    <span className="font-bold truncate block">{serverName(viewOrderModal)}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">{language === "km" ? "ស្ថានភាព" : "Status"}</span>
                    <div className="mt-0.5"><OrderStatusBadge status={viewOrderModal.status} /></div>
                  </div>
                </div>

                {/* Items Section */}
                <div>
                  <div className="mb-2 flex items-center justify-between px-0.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Utensils size={13} />
                      {t.itemsOrdered}
                    </h4>
                    <span className="text-xs font-extrabold text-[#696cff]">
                      {viewOrderModal.items?.length || 0} {language === "km" ? "មុខម្ហូប" : "item(s)"}
                    </span>
                  </div>

                  {!viewOrderModal.items || viewOrderModal.items.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-center text-xs font-semibold text-slate-400">
                      <ShoppingBag size={24} className="mx-auto mb-2 opacity-50" />
                      {t.noItems}
                    </div>
                  ) : (
                    <div className={`rounded-xl border overflow-hidden ${dark ? "border-[#383a50]" : "border-slate-200/80"}`}>
                      <table className="w-full text-left text-xs">
                        <thead className={`border-b text-[10px] font-bold uppercase tracking-wider ${dark ? "bg-[#252836] border-[#383a50] text-slate-400" : "bg-slate-100/80 text-slate-500"}`}>
                          <tr>
                            <th className="px-4 py-2.5">{t.item}</th>
                            <th className="px-3 py-2.5 text-center">{t.qty}</th>
                            <th className="px-4 py-2.5 text-right">{t.price}</th>
                            <th className="px-4 py-2.5 text-right">{t.total}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#383a50]">
                          {viewOrderModal.items.map((item, idx) => (
                            <tr key={item.id || idx} className={dark ? "hover:bg-white/5" : "hover:bg-slate-50/70"}>
                              <td className="px-4 py-3">
                                <div className="font-bold text-slate-800 dark:text-slate-100">{item.product?.name || item.name || `Item #${item.productId}`}</div>
                                {item.notes && <div className="text-[11px] text-amber-500 font-medium mt-0.5">Note: {item.notes}</div>}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="inline-flex rounded bg-[#696cff]/10 px-2 py-0.5 text-xs font-extrabold text-[#696cff]">
                                  x{item.quantity}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-slate-500 font-medium">{money(item.unitPrice)}</td>
                              <td className="px-4 py-3 text-right font-black text-[#696cff]">{money(item.totalPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Total Breakdown */}
                <div className={`rounded-xl border p-4 space-y-2 text-xs ${dark ? "border-[#383a50] bg-[#171923]" : "border-slate-200/80 bg-slate-50/50"}`}>
                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>Subtotal</span>
                    <span className="font-bold">{money(viewOrderModal.subtotal)}</span>
                  </div>
                  {Number(viewOrderModal.discountAmount || 0) > 0 && (
                    <div className="flex justify-between text-red-500 font-medium">
                      <span>Discount</span>
                      <span className="font-bold">-{money(viewOrderModal.discountAmount)}</span>
                    </div>
                  )}
                  {Number(viewOrderModal.taxAmount || 0) > 0 && (
                    <div className="flex justify-between text-slate-500 font-medium">
                      <span>Tax / Service Charge</span>
                      <span className="font-bold">+{money(viewOrderModal.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2.5 text-base font-black">
                    <span>{language === "km" ? "ទឹកប្រាក់សរុប" : "Total Amount"}</span>
                    <span className="text-[#696cff]">{money(viewOrderModal.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className={`flex items-center justify-between border-t px-6 py-4 ${dark ? "border-[#383a50] bg-[#252836]" : "border-slate-100 bg-slate-50/90"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t.changeStatus}:</span>
                  <select
                    value={viewOrderModal.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as OrderStatus;
                      changeStatus(viewOrderModal, newStatus);
                      setViewOrderModal((curr) => curr ? { ...curr, status: newStatus } : null);
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold outline-none cursor-pointer ${dark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-300 bg-white text-slate-800"}`}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setViewOrderModal(null)}
                  className="rounded-xl bg-[#696cff] px-5 py-2 text-xs font-bold text-white hover:bg-[#5f61e6] active:scale-95 transition-all shadow-md shadow-[#696cff]/20"
                >
                  {t.close}
                </button>
              </div>
            </div>
          </div>
        )}
    </main>
  );
}

function SummaryCard({
  label,
  value,
  note,
  tone,
  dark,
  liveLabel,
}: {
  label: string;
  value: string;
  note: string;
  tone: "blue" | "green" | "red" | "purple";
  dark: boolean;
  liveLabel: string;
}) {
  const tones = {
    blue: "bg-[#e7e7ff] text-[#696cff]",
    green: "bg-[#e8fadf] text-[#71dd37]",
    red: "bg-[#ffe0db] text-[#ff3e1d]",
    purple: "bg-[#f2e7ff] text-[#8553f4]",
  };

  return (
    <div
      className={`rounded border p-4 shadow-sm ${
        dark ? "border-slate-700/70 bg-[#111827]" : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-500">{label}</div>
          <div
            className={`mt-1 text-2xl font-bold tracking-tight ${
              dark ? "text-slate-100" : "text-slate-900"
            }`}
          >
            <AnimatedCounter value={value} />
          </div>
        </div>

        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}>
          {liveLabel}
        </span>
      </div>

      <div className="text-xs font-medium text-blue-600">{note}</div>
    </div>
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
