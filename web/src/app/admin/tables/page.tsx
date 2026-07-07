"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Armchair,
  Clock3,
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
} from "lucide-react";
import { useAppTheme } from "../../../lib/theme";
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

function waitMinutes(order?: Order) {
  if (!order) return 0;
  const created = new Date(order.createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / 60000));
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
  const [theme] = useAppTheme();
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
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

    socket?.on("order:created", onOrderChanged);
    socket?.on("order:updated", onOrderChanged);

    const refreshTimer = window.setInterval(() => {
      void load();
    }, 30000);

    return () => {
      socket?.off("order:created", onOrderChanged);
      socket?.off("order:updated", onOrderChanged);
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

      if (tableForm.id) {
        const updated = await updateTable(tableForm.id, payload);
        setTables((current) =>
          current
            .map((table) => (table.id === updated.id ? updated : table))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setMessage("Table updated.");
      } else {
        const created = await createTable(payload);
        setTables((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
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

  async function copyQrLink(table: DiningTable) {
    await navigator.clipboard.writeText(qrLink(table));
    setMessage(`QR link copied for ${table.name}.`);
  }

  async function removeTable(table: DiningTable) {
    const ok = window.confirm(`Delete ${table.name}?`);
    if (!ok) return;

    setMessage("");

    try {
      await deleteTable(table.id);
      setTables((current) => current.filter((entry) => entry.id !== table.id));
      if (tableForm.id === table.id) closeTableModal();
      setLastUpdated(new Date());
      setMessage("Table deleted.");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? `${err.message}. Login as Admin to delete tables.`
          : "Unable to delete table"
      );
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

  const tableCards = useMemo(
    () =>
      tables.map((table) => {
        const order = latestOrderByTable[table.id];
        const state = getTableState(table, order);
        return { table, order, state };
      }),
    [latestOrderByTable, tables]
  );


  return (
    <>
      <main className="flex-1 overflow-y-auto">
        <div className="grid min-h-full grid-cols-1 animate-[usersPageIn_520ms_cubic-bezier(0.16,1,0.3,1)_both]">
          <section className="px-6 py-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded bg-[#e7e7ff] px-3 py-1 text-xs font-bold text-[#696cff]">
                  <Store size={14} />
                  Main Floor Layout
                </div>
                <h1 className={`text-3xl font-bold tracking-tight ${textPrimary}`}>
                  Floor Dining Tables
                </h1>
                <p className={`mt-1 text-sm ${textSecondary}`}>
                  Real-time occupancy status from orders and KDS updates
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={openCreateTableModal}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded bg-[#696cff] px-4 text-xs font-semibold text-white shadow-sm shadow-[#696cff]/20 hover:bg-[#5f61e6] active:scale-95 transition-all"
                >
                  <Plus size={15} />
                  Add Table
                </button>

                <div className={`flex items-center gap-3 rounded border px-3 py-2 text-xs font-semibold ${surface} ${borderCol} ${textSecondary}`}>
                  <span>{lastUpdated ? `Sync ${lastUpdated.toLocaleTimeString()}` : "Connecting..."}</span>
                  <button
                    type="button"
                    onClick={load}
                    className="flex h-8 w-8 items-center justify-center rounded bg-[#696cff] text-white active:scale-90 transition-all shadow-sm"
                    title="Refresh tables"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* State Badges Row */}
            <div className="mb-7 flex flex-wrap items-center gap-5">
              {(["available", "occupied", "dirty", "reserved", "inactive"] as const).map((state) => (
                <div key={state} className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#8592a3]">
                  <span className={`h-2.5 w-2.5 rounded-full ${tableStateStyles[state].dot}`} />
                  {tableStateStyles[state].label}
                </div>
              ))}
            </div>

            {message && (
              <div className="mb-5 rounded border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {message}
              </div>
            )}

            {loading ? (
              <div className={`rounded border p-12 text-center text-sm ${borderCol} ${textSecondary} bg-white/40`}>
                <Loader2 className="mx-auto mb-3 animate-spin text-[#696cff]" size={28} />
                Loading live floor plan...
              </div>
            ) : tables.length === 0 ? (
              <div className={`rounded border border-dashed p-12 text-center text-sm ${borderCol} ${textSecondary} bg-white/40`}>
                <Armchair size={32} className="mx-auto mb-3 text-slate-300" />
                No dining tables configured on the floor layout.
              </div>
            ) : (
              <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 items-start justify-start">
                {tableCards.map(({ table, order, state }) => {
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
                      className={`w-full min-h-[185px] rounded-xl border-2 p-3.5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 ease-out flex flex-col justify-between ${styles.border} ${cardBackground}`}
                    >
                      <div>
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#a1acb8]">Table</div>
                            <div className={`text-2xl font-bold leading-none ${state === "inactive" ? "text-slate-400" : "text-[#566a7f]"}`}>
                              {table.name}
                            </div>
                          </div>

                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0 ${styles.badge}`}>
                            {styles.label}
                          </span>
                        </div>

                        {/* Specs Grid */}
                        <div className="space-y-2 text-xs font-semibold">
                          <div className="flex items-center gap-2 text-[#8592a3]">
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[#566a7f] ${dark ? "bg-[#232333]" : "bg-[#f5f5f9]"}`}>
                              <UsersRound size={11} />
                            </span>
                            <span>{table.capacity} guests</span>
                          </div>

                          <div className="flex items-center gap-2 text-[#8592a3]">
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[#566a7f] ${dark ? "bg-[#232333]" : "bg-[#f5f5f9]"}`}>
                              <MapPin size={11} />
                            </span>
                            <span className="capitalize">{table.zone}</span>
                          </div>

                          <div className="flex items-center gap-2 text-[#8592a3]">
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[#566a7f] ${dark ? "bg-[#232333]" : "bg-[#f5f5f9]"}`}>
                              <QrCode size={11} />
                            </span>
                            <span className="truncate max-w-[120px]">
                              {table.qrToken ? `/qr/${table.qrToken}` : "No QR"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Lower Area (Orders / Actions) */}
                      <div>
                        {order ? (
                          <div className="mt-4 rounded bg-[#f5f5f9] dark:bg-[#232333] px-3 py-2 text-xs text-[#566a7f] border border-slate-100/60">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-bold text-[#696cff]">{formatShortOrderNo(order)}</span>
                              <span className="rounded bg-[#eceef1] px-1.5 py-0.5 text-[8px] font-bold uppercase">{order.status}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-[#a1acb8]">
                              <Clock3 size={11} />
                              <span>{waitMinutes(order)} min active</span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-5 flex items-center justify-center">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#eceef1] text-[#eceef1]">
                              <Armchair size={15} />
                            </div>
                          </div>
                        )}

                        {state === "dirty" && order && (
                          <button
                            type="button"
                            disabled={clearingId === order.id}
                            onClick={() => clearTable(order)}
                            className="mt-4 w-full rounded bg-[#ffab00] hover:bg-[#e09600] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-[#ffab00]/10 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                          >
                            {clearingId === order.id ? (
                              <>
                                <Loader2 className="animate-spin" size={13} />
                                Clearing...
                              </>
                            ) : (
                              "Clear & Prepare Table"
                            )}
                          </button>
                        )}

                        <div className="mt-4 flex gap-2">
                          {table.qrToken && (
                            <button
                              type="button"
                              onClick={() => {
                                setQrImageFailed(false);
                                setQrTable(table);
                              }}
                              className={`flex h-9 items-center justify-center gap-2 rounded border px-3 text-xs font-bold transition-all ${
                                dark
                                  ? "border-[#4e4f6e] bg-[#232333] text-slate-300 hover:border-[#71dd37] hover:text-[#71dd37]"
                                  : "border-[#d9dee3] bg-white text-[#8592a3] hover:border-[#71dd37] hover:text-[#71dd37] hover:bg-[#e8fadf]/10"
                              }`}
                              title="Show QR code"
                            >
                              <QrCode size={13} />
                              QR
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => editTable(table)}
                            className={`flex h-9 flex-1 items-center justify-center gap-2 rounded border text-xs font-bold transition-all ${
                              dark
                                ? "border-[#4e4f6e] bg-[#232333] text-slate-300 hover:border-[#696cff] hover:text-[#696cff]"
                                : "border-[#d9dee3] bg-white text-[#8592a3] hover:border-[#696cff] hover:text-[#696cff] hover:bg-[#e7e7ff]/10"
                            }`}
                          >
                            <Pencil size={13} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removeTable(table)}
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
          </section>


        </div>
      </main>

      {/* CREATE / EDIT TABLE MODAL */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close table dialog"
            onClick={closeTableModal}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-[tableModalBackdrop_180ms_ease-out]"
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
                  className="h-4.5 w-4.5 accent-[#696cff] cursor-pointer"
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
                <button className="flex h-10 flex-1 items-center justify-center gap-2 rounded bg-[#696cff] px-4 text-xs font-semibold text-white shadow-sm shadow-[#696cff]/20 hover:bg-[#5f61e6] active:scale-95 transition-all">
                  {tableForm.id ? <Save size={14} /> : <Plus size={14} />}
                  {tableForm.id ? "Update Setup" : "Save Table"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR CODE PREVIEW DIALOG */}
      {qrTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close QR dialog"
            onClick={() => setQrTable(null)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-[tableModalBackdrop_180ms_ease-out]"
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

            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#696cff]/10 text-[#696cff] shadow-sm">
              <QrCode size={24} />
            </div>
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
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#696cff] px-4 text-xs font-bold text-white shadow-md shadow-[#696cff]/25 hover:bg-[#5f61e6] active:scale-95 transition-all"
              >
                Open Demo
              </a>
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

