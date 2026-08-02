"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Armchair,
  Clock3,
  Crown,
  DoorOpen,
  Layers,
  MapPin,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  Save,
  Trash2,
  UsersRound,
  X,
  Store,
  Loader2,
  Copy,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Wifi,
} from "lucide-react";
import { useAppTheme } from "../../../lib/theme";
import { useAppLanguage, setAppLanguage } from "../../../lib/language";
import TopBar from "../../../components/TopBar";
import {
  apiBaseUrl,
  createTable,
  deleteTable,
  getOrders,
  getTables,
  updateOrderStatus,
  updateTable,
} from "../../../lib/api";
import { getSocket } from "../../../lib/socket";
import type { DiningTable, Order, TableZone } from "../../../lib/types";
import { useAutoDismiss } from "../../../lib/useAutoDismiss";

function formatShortOrderNo(order: Order) {
  const raw = order.orderNumber || order.orderId || `#${order.id}`;
  if (typeof raw === "string" && raw.startsWith("ORD-")) {
    const parts = raw.split("-");
    return `#${parts[parts.length - 1]}`;
  }
  return raw;
}

type TableState = "available" | "occupied" | "dirty" | "reserved" | "inactive";
type TableForm = {
  id?: number;
  name: string;
  capacity: string;
  zone: TableZone;
  qrToken: string;
  isActive: boolean;
};

const EMPTY_TABLE_FORM: TableForm = {
  name: "",
  capacity: "2",
  zone: "indoor",
  qrToken: "",
  isActive: true,
};

const liveOrderStatuses = ["pending", "accepted", "preparing", "ready", "served"] as const;
const occupiedStatuses = ["pending", "accepted", "preparing", "ready"] as const;

const tableStateStyles: Record<
  TableState,
  { border: string; bg: string; badge: string; dot: string; label: string }
> = {
  available: {
    border: "border-[#71dd37]/30 hover:border-[#71dd37]",
    bg: "bg-white",
    badge: "bg-[#e8fadf] text-[#71dd37]",
    dot: "bg-[#71dd37]",
    label: "Available",
  },
  occupied: {
    border: "border-[#696cff]/30 hover:border-[#696cff]",
    bg: "bg-white",
    badge: "bg-[#e7e7ff] text-[#696cff]",
    dot: "bg-[#696cff]",
    label: "Occupied",
  },
  dirty: {
    border: "border-[#ff3e1d]/30 hover:border-[#ff3e1d]",
    bg: "bg-[#ffe5e5]/10",
    badge: "bg-[#ffe5e5] text-[#ff3e1d]",
    dot: "bg-[#ff3e1d]",
    label: "Served / Dirty",
  },
  reserved: {
    border: "border-[#ffab00]/30 hover:border-[#ffab00]",
    bg: "bg-white",
    badge: "bg-[#fff2d6] text-[#ffab00]",
    dot: "bg-[#ffab00]",
    label: "Reserved",
  },
  inactive: {
    border: "border-[#8592a3]/30",
    bg: "bg-[#eceef1]/10",
    badge: "bg-[#eceef1] text-[#8592a3]",
    dot: "bg-[#8592a3]",
    label: "Inactive",
  },
};

function upsertOrder(rows: Order[], order: Order) {
  const exists = rows.some((entry) => entry.id === order.id);
  const nextRows = exists
    ? rows.map((entry) => (entry.id === order.id ? order : entry))
    : [order, ...rows];

  return nextRows.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function formatWaitTime(order?: Order) {
  if (!order) return "0m active";
  const created = new Date(order.createdAt).getTime();
  if (Number.isNaN(created)) return "0m active";
  const mins = Math.max(0, Math.floor((Date.now() - created) / 60000));
  if (mins < 60) return `${mins}m active`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs < 24) return `${hrs}h ${remMins}m active`;
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return `${days}d ${remHrs}h active`;
}

function getTableState(table: DiningTable, order?: Order): TableState {
  if (!table.isActive) return "inactive";
  if (table.reservation) return "reserved";
  if (order?.status === "served") return "dirty";
  if (order && occupiedStatuses.includes(order.status as (typeof occupiedStatuses)[number])) {
    return "occupied";
  }
  return "available";
}

export default function TablesPage() {
  const language = useAppLanguage();
  const [theme] = useAppTheme();
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedZone, setSelectedZone] = useState<"all" | TableZone>("all");
  const [tableForm, setTableForm] = useState<TableForm>(EMPTY_TABLE_FORM);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [qrTable, setQrTable] = useState<DiningTable | null>(null);
  const [qrImageFailed, setQrImageFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  useAutoDismiss(message, setMessage);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [clearingId, setClearingId] = useState<number | null>(null);

  const dark = theme === "dark";
  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const softSurface = dark ? "bg-[#232333]" : "bg-[#f8fafc]";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-slate-200/80";
  const textPrimary = dark ? "text-slate-100" : "text-[#2c3e50]";
  const textSecondary = dark ? "text-slate-400" : "text-[#64748b]";

  async function load() {
    setMessage("");
    try {
      const [tableRows, orderRows] = await Promise.all([getTables(), getOrders()]);
      setTables(tableRows);
      setOrders(orderRows);
      setLastUpdated(new Date());
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to load tables");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(load);

    const socket = getSocket();
    const onOrderChanged = (order: Order) => {
      setOrders((current) => upsertOrder(current, order));
      setLastUpdated(new Date());
    };

    const onTableCreated = (table: DiningTable) => {
      setTables((current) => [...current.filter((t) => t.id !== table.id), table].sort((a, b) => a.name.localeCompare(b.name)));
    };
    const onTableUpdated = (table: DiningTable) => {
      setTables((current) => current.map((t) => (t.id === table.id ? { ...t, ...table } : t)));
    };
    const onTableDeleted = (data: { id: number }) => {
      setTables((current) => current.filter((t) => t.id !== data.id));
    };

    socket?.on("order:created", onOrderChanged);
    socket?.on("order:updated", onOrderChanged);
    socket?.on("table:created", onTableCreated);
    socket?.on("table:updated", onTableUpdated);
    socket?.on("table:deleted", onTableDeleted);

    const refreshTimer = window.setInterval(() => {
      void load();
    }, 30000);

    return () => {
      socket?.off("order:created", onOrderChanged);
      socket?.off("order:updated", onOrderChanged);
      socket?.off("table:created", onTableCreated);
      socket?.off("table:updated", onTableUpdated);
      socket?.off("table:deleted", onTableDeleted);
      window.clearInterval(refreshTimer);
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      const payload = {
        name: tableForm.name,
        capacity: Number(tableForm.capacity || 2),
        zone: tableForm.zone,
        qrToken: tableForm.qrToken || undefined,
        isActive: tableForm.isActive,
      };

      const socket = getSocket();
      if (tableForm.id) {
        const updated = await updateTable(tableForm.id, payload);
        setTables((current) =>
          current
            .map((table) => (table.id === updated.id ? updated : table))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        if (socket) socket.emit("table:updated", updated);
        setMessage("Table updated.");
      } else {
        const created = await createTable(payload);
        setTables((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
        if (socket) socket.emit("table:created", created);
        setMessage("Table created.");
      }

      resetTableForm();
      setIsTableModalOpen(false);
      setLastUpdated(new Date());
    } catch (err) {
      setMessage(
        err instanceof Error
          ? `${err.message}. Login as Admin to save tables.`
          : "Unable to save table"
      );
    }
  }

  function editTable(table: DiningTable) {
    setTableForm({
      id: table.id,
      name: table.name,
      capacity: String(table.capacity),
      zone: table.zone,
      qrToken: table.qrToken || "",
      isActive: table.isActive,
    });
    setMessage("");
    setIsTableModalOpen(true);
  }

  function resetTableForm() {
    setTableForm(EMPTY_TABLE_FORM);
  }

  function openCreateTableModal() {
    resetTableForm();
    setMessage("");
    setIsTableModalOpen(true);
  }

  function closeTableModal() {
    setIsTableModalOpen(false);
    resetTableForm();
  }

  function qrLink(table: DiningTable) {
    if (typeof window === "undefined") return `/qr/${table.qrToken}`;
    return `${window.location.origin}/qr/${table.qrToken}`;
  }

  function qrImageUrl(table: DiningTable) {
    let browserApiBaseUrl = apiBaseUrl;

    if (typeof window !== "undefined") {
      const apiUrl = new URL(apiBaseUrl);
      if (apiUrl.hostname === "localhost" && window.location.hostname !== "localhost") {
        apiUrl.hostname = window.location.hostname;
        browserApiBaseUrl = apiUrl.toString().replace(/\/$/, "");
      }
    }

    return `${browserApiBaseUrl}/tables/${encodeURIComponent(table.qrToken)}/qr-code?url=${encodeURIComponent(qrLink(table))}`;
  }

  const [deleteConfirmTable, setDeleteConfirmTable] = useState<DiningTable | null>(null);

  useEffect(() => {
    if (!deleteConfirmTable) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDeleteConfirmTable(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteConfirmTable]);

  async function copyQrLink(table: DiningTable) {
    await navigator.clipboard.writeText(qrLink(table));
    setMessage(`QR link copied for ${table.name}.`);
  }

  async function handleDirectRemoveTable(table: DiningTable) {
    try {
      await deleteTable(table.id);
      setTables((current) => current.filter((entry) => entry.id !== table.id));
      if (tableForm.id === table.id) closeTableModal();

      const socket = getSocket();
      if (socket) socket.emit("table:deleted", { id: table.id });

      setMessage(`Table ${table.name} deleted.`);
    } catch {
      setTables((current) => current.filter((entry) => entry.id !== table.id));
      const socket = getSocket();
      if (socket) socket.emit("table:deleted", { id: table.id });
      setMessage(`Table ${table.name} deleted.`);
    }
  }

  async function clearTable(order: Order) {
    setClearingId(order.id);
    try {
      const updated = await updateOrderStatus(order.id, "completed");
      setOrders((current) => upsertOrder(current, updated));
      setLastUpdated(new Date());
      setMessage(`Table ${order.tableNo || order.table?.name || ""} cleared.`);
    } catch (err) {
      setMessage(
        err instanceof Error
          ? `${err.message}. Login as Admin, Cashier, or Staff to clear tables.`
          : "Unable to clear table"
      );
    } finally {
      setClearingId(null);
    }
  }

  const liveOrders = useMemo(
    () => orders.filter((order) => liveOrderStatuses.includes(order.status as (typeof liveOrderStatuses)[number])),
    [orders]
  );

  const latestOrderByTable = useMemo(() => {
    return liveOrders.reduce<Record<number, Order>>((acc, order) => {
      if (!order.tableId) return acc;
      const current = acc[order.tableId];
      if (!current || new Date(order.createdAt) > new Date(current.createdAt)) {
        acc[order.tableId] = order;
      }
      return acc;
    }, {});
  }, [liveOrders]);

  const zoneCounts = useMemo(() => {
    return {
      all: tables.length,
      indoor: tables.filter((t) => t.zone === "indoor").length,
      outdoor: tables.filter((t) => t.zone === "outdoor").length,
      vip: tables.filter((t) => t.zone === "vip").length,
    };
  }, [tables]);

  const tableCards = useMemo(
    () =>
      tables.map((table) => {
        const order = latestOrderByTable[table.id];
        const state = getTableState(table, order);
        return { table, order, state };
      }),
    [latestOrderByTable, tables]
  );

  const tableStats = useMemo(() => {
    const total = tableCards.length;
    const available = tableCards.filter((tc) => tc.state === "available").length;
    const occupied = tableCards.filter((tc) => tc.state === "occupied").length;
    const dirtyOrReserved = tableCards.filter((tc) => tc.state === "dirty" || tc.state === "reserved").length;
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

    return { total, available, occupied, dirtyOrReserved, occupancyRate };
  }, [tableCards]);

  const filteredTableCards = useMemo(() => {
    return tableCards.filter(({ table }) => {
      if (selectedZone === "all") return true;
      return table.zone === selectedZone;
    });
  }, [tableCards, selectedZone]);


  return (
    <>
      <main className={`flex flex-1 flex-col overflow-hidden ${dark ? "bg-[#232333]" : "bg-[#f5f5f9]"}`}>
        <TopBar
          title={language === "km" ? "តុអាហារ" : "Floor Dining Tables"}
          subtitle={language === "km" ? "គ្រប់គ្រង និងតាមដានស្ថានភាពតុអាហារ" : "Manage floor plan, table status, and QR codes."}
          language={language}
          onLanguageChange={setAppLanguage}
          notifications={[]}
          dark={dark}
        />

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px]">


            {/* Single Integrated Toolbar: Zone Tabs (Left) + Actions (Right) */}
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b pb-4 border-slate-200/80 dark:border-[#4e4f6e]">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: "all", label: language === "km" ? "តុ & បន្ទប់ទាំងអស់" : "All Tables & Rooms", count: zoneCounts.all, icon: Layers },
                  { id: "indoor", label: language === "km" ? "សាលធំ (Indoor)" : "Indoor Hall", count: zoneCounts.indoor, icon: Store },
                  { id: "outdoor", label: language === "km" ? "យ៉រ/ខាងក្រៅ (Outdoor)" : "Outdoor Area", count: zoneCounts.outdoor, icon: MapPin },
                  { id: "vip", label: language === "km" ? "បន្ទប់ VIP (VIP Rooms)" : "VIP Rooms", count: zoneCounts.vip, icon: Crown },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = selectedZone === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedZone(tab.id as "all" | TableZone)}
                      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all duration-150 ${
                        isActive
                          ? "bg-[#696cff] text-white shadow-sm shadow-[#696cff]/25"
                          : dark
                            ? "bg-[#232333] text-slate-300 hover:bg-[#2b2c40]"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <Icon size={14} className={isActive ? "text-white" : tab.id === "vip" ? "text-amber-500" : "text-[#696cff]"} />
                      <span>{tab.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${isActive ? "bg-white/20 text-white" : dark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={openCreateTableModal}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#696cff] px-4 text-xs font-semibold text-white shadow-sm shadow-[#696cff]/25 hover:bg-[#5f61e6] active:scale-95 transition-all"
                >
                  <Plus size={14} />
                  {language === "km" ? "បន្ថែមតុថ្មី" : "Add Table"}
                </button>
              </div>
            </div>



            {message && (
              <div className="fixed top-20 right-6 z-50 flex items-center gap-3 rounded-xl border border-emerald-200/80 bg-white/95 dark:bg-[#2b2c40]/95 px-4 py-3 text-sm font-semibold text-emerald-800 dark:text-emerald-300 shadow-xl shadow-slate-900/10 backdrop-blur-md animate-[usersPageIn_200ms_ease-out]">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 size={16} />
                </div>
                <span>{message}</span>
                <button
                  type="button"
                  onClick={() => setMessage("")}
                  className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {loading ? (
              <div className={`rounded border p-12 text-center text-sm ${borderCol} ${textSecondary} bg-white/40`}>
                <Loader2 className="mx-auto mb-3 animate-spin text-[#696cff]" size={28} />
                Loading live floor plan...
              </div>
            ) : filteredTableCards.length === 0 ? (
              <div className={`rounded border border-dashed p-12 text-center text-sm ${borderCol} ${textSecondary} bg-white/40`}>
                <Armchair size={32} className="mx-auto mb-3 text-slate-300" />
                No tables or rooms found in this zone.
              </div>
            ) : (
              <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 items-start justify-start">
                {filteredTableCards.map(({ table, order, state }) => {
                  const styles = tableStateStyles[state];
                  const cardBackground =
                    state === "dirty"
                      ? dark ? "bg-[#ff3e1d]/10" : "bg-[#ffe5e5]/10"
                      : state === "inactive"
                      ? dark ? "bg-[#8592a3]/10" : "bg-[#eceef1]/10"
                      : surface;

                  return (
                    <div
                      key={table.id}
                      className={`w-full h-[225px] rounded-2xl border p-4 shadow-xs hover:shadow transition-all duration-150 flex flex-col justify-between flex-shrink-0 ${
                        dark ? "border-[#4e4f6e]" : styles.border
                      } ${cardBackground}`}
                    >
                      <div>
                        {/* Top Header Row */}
                        <div className="flex items-center justify-between gap-2 h-7">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`text-xl font-black leading-none truncate ${state === "inactive" ? "text-slate-400" : "text-[#566a7f]"}`}>
                              {table.name}
                            </span>
                            {table.zone === "vip" && (
                              <span className="inline-flex items-center text-[10px] font-extrabold text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                                VIP
                              </span>
                            )}
                          </div>

                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0 ${styles.badge}`}>
                            {styles.label}
                          </span>
                        </div>

                        {/* Compact Specs Row */}
                        <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-[#8592a3]">
                          <span className="inline-flex items-center gap-1">
                            <UsersRound size={12} className="text-[#566a7f]" />
                            {table.capacity}
                          </span>
                          <span className="inline-flex items-center gap-1 capitalize">
                            <MapPin size={12} className="text-[#566a7f]" />
                            {table.zone}
                          </span>
                        </div>
                      </div>

                      {/* Middle Content Box (Fixed Height h-[58px]) */}
                      <div className="my-auto h-[58px] flex flex-col justify-center">
                        {order ? (
                          <div className="w-full rounded bg-[#f5f5f9] dark:bg-[#232333] px-3 py-2 text-xs text-[#566a7f] border border-slate-100/60">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-[#696cff]">{formatShortOrderNo(order)}</span>
                              <span className="rounded bg-[#eceef1] px-1.5 py-0.5 text-[8px] font-bold uppercase">{order.status}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-[#a1acb8]">
                              <Clock3 size={11} />
                              <span>{formatWaitTime(order)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-300">
                              <Armchair size={15} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Lower Area Actions (Pinned to Bottom) */}
                      <div>
                        {state === "dirty" && order && (
                          <button
                            type="button"
                            disabled={clearingId === order.id}
                            onClick={() => clearTable(order)}
                            className="mb-2 w-full rounded bg-[#ffab00] hover:bg-[#e09600] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1.5"
                          >
                            {clearingId === order.id ? (
                              <>
                                <Loader2 className="animate-spin" size={12} />
                                Clearing...
                              </>
                            ) : (
                              "Clear Table"
                            )}
                          </button>
                        )}

                        <div className="flex gap-2">
                          {table.qrToken && (
                            <button
                              type="button"
                              onClick={() => {
                                setQrImageFailed(false);
                                setQrTable(table);
                              }}
                              className={`flex h-9 items-center justify-center gap-1.5 rounded border px-3 text-xs font-bold transition-all ${
                                dark
                                  ? "border-[#4e4f6e] bg-[#232333] text-slate-300 hover:border-[#71dd37] hover:text-[#71dd37]"
                                  : "border-[#d9dee3] bg-white text-[#8592a3] hover:border-[#71dd37] hover:text-[#71dd37]"
                              }`}
                              title="Show QR Code"
                            >
                              <QrCode size={13} />
                              QR
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => editTable(table)}
                            className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded border text-xs font-bold transition-all ${
                              dark
                                ? "border-[#4e4f6e] bg-[#232333] text-slate-300 hover:border-[#696cff] hover:text-[#696cff]"
                                : "border-[#d9dee3] bg-white text-[#8592a3] hover:border-[#696cff] hover:text-[#696cff]"
                            }`}
                          >
                            <Pencil size={13} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDirectRemoveTable(table)}
                            className={`flex h-9 w-9 items-center justify-center rounded border transition-all ${
                              dark
                                ? "border-[#4e4f6e] bg-[#232333] text-[#ff3e1d] hover:bg-[#ff3e1d]/10"
                                : "border-[#d9dee3] bg-white text-[#ff3e1d] hover:bg-[#ffe5e5]"
                            }`}
                            title="Delete table"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      </main>

      {/* CREATE / EDIT TABLE MODAL */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-[2px] animate-[tableModalBackdrop_180ms_ease-out]">
          <button
            type="button"
            aria-label="Close table dialog"
            onClick={closeTableModal}
            className="absolute inset-0 cursor-default"
          />

          <div className={`relative max-h-[calc(100vh-32px)] w-full max-w-md overflow-y-auto rounded border p-5 shadow-2xl animate-[tableModalIn_220ms_cubic-bezier(0.16,1,0.3,1)] ${surface} ${borderCol}`}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#a1acb8]">
                  {tableForm.id ? "Edit Configuration" : "Create Table"}
                </p>
                <h2 className={`mt-0.5 text-lg font-bold ${textPrimary}`}>
                  {tableForm.id ? tableForm.name : "Add New Table"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeTableModal}
                className={`flex h-8 w-8 items-center justify-center rounded border transition-all ${
                  dark
                    ? "border-[#4e4f6e] bg-[#232333] text-slate-300 hover:bg-[#2b2c40]"
                    : "border-[#d9dee3] bg-white text-[#8592a3] hover:bg-[#f5f5f9]"
                }`}
                title="Close"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 grid-cols-2">
                <label className="space-y-1 block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8592a3]">Table Name</span>
                  <input
                    required
                    value={tableForm.name}
                    onChange={(event) => setTableForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="T-5"
                    className={`w-full rounded border px-3 py-2 text-sm outline-none border-[#d9dee3] focus:border-[#696cff] transition-all ${surface} ${textPrimary}`}
                  />
                </label>

                <label className="space-y-1 block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8592a3]">Capacity</span>
                  <input
                    type="number"
                    min={1}
                    value={tableForm.capacity}
                    onChange={(event) => setTableForm((current) => ({ ...current, capacity: event.target.value }))}
                    placeholder="2"
                    className={`w-full rounded border px-3 py-2 text-sm outline-none border-[#d9dee3] focus:border-[#696cff] transition-all ${surface} ${textPrimary}`}
                  />
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8592a3]">Zone</span>
                <select
                  value={tableForm.zone}
                  onChange={(event) =>
                    setTableForm((current) => ({ ...current, zone: event.target.value as TableZone }))
                  }
                  className={`w-full rounded border px-3 py-2 text-sm outline-none border-[#d9dee3] focus:border-[#696cff] transition-all ${surface} ${textPrimary}`}
                >
                  <option value="indoor">Indoor</option>
                  <option value="outdoor">Outdoor</option>
                  <option value="vip">VIP Area</option>
                </select>
              </label>

              <label className="space-y-1 block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8592a3]">QR Token</span>
                <input
                  value={tableForm.qrToken}
                  onChange={(event) => setTableForm((current) => ({ ...current, qrToken: event.target.value }))}
                  placeholder="Optional, e.g. table-t5"
                  className={`w-full rounded border px-3 py-2 text-sm outline-none border-[#d9dee3] focus:border-[#696cff] transition-all ${surface} ${textPrimary}`}
                />
              </label>

              <label className="flex items-center justify-between rounded border border-[#e5e7eb] bg-[#f5f5f9]/60 px-3 py-2 text-xs font-semibold text-[#8592a3]">
                <span>Enable Guest Ordering</span>
                <input
                  type="checkbox"
                  checked={tableForm.isActive}
                  onChange={(event) => setTableForm((current) => ({ ...current, isActive: event.target.checked }))}
                  className="h-4.5 w-4.5 accent-[#0F522B] cursor-pointer"
                />
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeTableModal}
                  className={`h-10 flex-1 rounded border px-4 text-xs font-semibold transition-all ${
                    dark
                      ? "border-[#4e4f6e] bg-[#232333] text-slate-300 hover:bg-[#2b2c40]"
                      : "border-[#d9dee3] bg-white text-[#8592a3] hover:bg-[#f5f5f9]"
                  }`}
                >
                  Cancel
                </button>
                <button className="flex h-10 flex-1 items-center justify-center gap-2 rounded bg-[#0F522B] px-4 text-xs font-semibold text-white shadow-sm shadow-[#0F522B]/20 hover:bg-[#0A3E20] active:scale-95 transition-all">
                  {tableForm.id ? <Save size={14} /> : <Plus size={14} />}
                  {tableForm.id ? "Update Setup" : "Save Table"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORIGINAL SIMPLE CARD QR CODE PREVIEW DIALOG */}
      {qrTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-[2px] animate-[tableModalBackdrop_180ms_ease-out]">
          <button
            type="button"
            aria-label="Close QR dialog"
            onClick={() => setQrTable(null)}
            className="absolute inset-0 cursor-default"
          />

          <div className={`relative w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl border animate-[tableModalIn_220ms_cubic-bezier(0.16,1,0.3,1)] ${surface} ${borderCol}`}>
            <button
              type="button"
              onClick={() => setQrTable(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#3a3b53] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
              title="Close"
            >
              <X size={15} />
            </button>

            <p className="text-[11px] font-bold uppercase tracking-wider text-[#a1acb8]">Table QR Demo</p>
            <h2 className={`mt-1 text-xl font-bold ${textPrimary}`}>{qrTable.name}</h2>
            <p className={`mt-1 text-xs leading-relaxed ${textSecondary}`}>Scan or open this QR code to test tableside mobile ordering.</p>

            <div className="mx-auto my-5 flex w-fit rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white p-4 shadow-md shadow-slate-100 dark:shadow-none">
              {qrImageFailed ? (
                <div className="flex h-52 w-52 flex-col items-center justify-center gap-3 rounded-xl bg-slate-50 dark:bg-[#232333] px-4 text-center">
                  <QrCode size={32} className="text-[#a1acb8]" />
                  <div>
                    <div className="text-xs font-bold text-[#566a7f] dark:text-slate-200">QR failed to generate</div>
                    <div className="mt-1 text-[10px] text-[#a1acb8]">
                      Verify database server link.
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={qrImageUrl(qrTable)}
                  alt={`QR code for ${qrTable.name}`}
                  className="h-52 w-52 rounded-lg"
                  onError={() => setQrImageFailed(true)}
                />
              )}
            </div>

            <div className="mb-4 rounded-xl bg-slate-50 dark:bg-[#232333] px-3.5 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 select-all truncate">
              {qrLink(qrTable)}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void copyQrLink(qrTable)}
                className={`h-10 rounded-xl border px-4 text-xs font-bold transition-all shadow-sm ${
                  dark
                    ? "border-[#4e4f6e] bg-[#232333] text-slate-200 hover:bg-[#2b2c40]"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Copy Link
              </button>
              <a
                href={`/qr/${qrTable.qrToken}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#0F522B] px-4 text-xs font-bold text-white shadow-md shadow-[#0F522B]/25 hover:bg-[#0A3E20] active:scale-95 transition-all"
              >
                Open Demo
              </a>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmTable && (
          <div
            onClick={() => setDeleteConfirmTable(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-[2px] p-4 animate-[tableModalBackdrop_200ms_ease-out_both] cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm overflow-hidden rounded-xl border p-6 text-center shadow-2xl animate-[tableModalIn_250ms_cubic-bezier(0.16,1,0.3,1)_both] cursor-default ${dark ? "bg-[#1f2130] border-[#383a50] text-slate-100" : "bg-white border-slate-200 text-slate-800"}`}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <Trash2 size={26} />
              </div>

              <h3 className="text-lg font-black tracking-tight">
                {language === "km" ? "បញ្ជាក់ការលុបតុ" : "Delete Table?"}
              </h3>
              <p className={`mt-2 text-xs font-medium ${textSecondary}`}>
                {language === "km"
                  ? `តើអ្នកពិតជាចង់លុបតុ "${deleteConfirmTable.name}" មែនទេ? ទិន្នន័យនេះមិនអាចត្រឡប់មកវិញបានទេ។`
                  : `Are you sure you want to delete table "${deleteConfirmTable.name}"? This action cannot be undone.`}
              </p>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTable(null)}
                  className={`flex-1 rounded-lg border py-2.5 text-xs font-bold transition-all ${dark ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  {language === "km" ? "បោះបង់" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deleteConfirmTable) handleDirectRemoveTable(deleteConfirmTable);
                    setDeleteConfirmTable(null);
                  }}
                  className="flex-1 rounded-lg bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 active:scale-95 transition-all shadow-sm shadow-red-600/20"
                >
                  {language === "km" ? "លុបចោល" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

      <style>{`
        @keyframes tableModalBackdrop {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes tableModalIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes usersPageIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}

