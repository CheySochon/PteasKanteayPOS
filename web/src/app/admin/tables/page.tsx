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
} from "lucide-react";
import { useAppTheme } from "../../lib/theme";
import {
  apiBaseUrl,
  createTable,
  deleteTable,
  getOrders,
  getTables,
  updateOrderStatus,
  updateTable,
} from "../../lib/api";
import { getSocket } from "../../lib/socket";
import type { DiningTable, Order, TableZone } from "../../lib/types";
import { useAutoDismiss } from "../../lib/useAutoDismiss";

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
    border: "border-[#10B981]",
    bg: "bg-white",
    badge: "bg-[#D1FAE5] text-[#047857]",
    dot: "bg-[#10B981]",
    label: "Available",
  },
  occupied: {
    border: "border-[#2563EB]",
    bg: "bg-white",
    badge: "bg-[#DBEAFE] text-[#1D4ED8]",
    dot: "bg-[#2563EB]",
    label: "Occupied",
  },
  dirty: {
    border: "border-[#F59E0B]",
    bg: "bg-[#FFF7ED]",
    badge: "bg-[#FEF3C7] text-[#B45309]",
    dot: "bg-[#F59E0B]",
    label: "Dirty",
  },
  reserved: {
    border: "border-[#94A3B8]",
    bg: "bg-white",
    badge: "bg-slate-200 text-slate-600",
    dot: "bg-[#94A3B8]",
    label: "Reserved",
  },
  inactive: {
    border: "border-slate-300",
    bg: "bg-slate-100",
    badge: "bg-slate-200 text-slate-500",
    dot: "bg-slate-400",
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

  const dark = theme === "dark";
  const surface = dark ? "bg-[#171a23]" : "bg-white";
  const borderCol = dark ? "border-[#2a2f3d]" : "border-[#E6EAF0]";
  const textPrimary = dark ? "text-slate-100" : "text-[#111827]";
  const textSecondary = dark ? "text-slate-400" : "text-[#64748B]";

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

  const recentActivity = liveOrders.slice(0, 4);

  return (
    <>
      <main className="flex-1 overflow-y-auto">
        <div className="grid min-h-full grid-cols-1 xl:grid-cols-[1fr_310px]">
          <section className="px-6 py-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className={`text-3xl font-black tracking-tight ${textPrimary}`}>
                  Main Dining Floor
                </h1>
                <p className={`mt-1 text-sm ${textSecondary}`}>
                  Live occupancy from table orders and kitchen status
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={openCreateTableModal}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-xs font-black text-white hover:bg-[#1D4ED8]"
                >
                  <Plus size={15} />
                  Add Table
                </button>

                <div className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-xs font-bold ${surface} ${borderCol} ${textSecondary}`}>
                  <span>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Connecting..."}</span>
                  <button
                    type="button"
                    onClick={load}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB] text-white"
                    title="Refresh tables"
                  >
                    <RefreshCw size={15} />
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-7 flex flex-wrap items-center gap-5">
              {(["available", "occupied", "dirty", "reserved"] as const).map((state) => (
                <div key={state} className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                  <span className={`h-2.5 w-2.5 rounded-full ${tableStateStyles[state].dot}`} />
                  {tableStateStyles[state].label}
                </div>
              ))}
            </div>

            {message && (
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                {message}
              </div>
            )}

            {loading ? (
              <div className={`rounded-2xl border p-12 text-center text-sm ${borderCol} ${textSecondary}`}>
                Loading live tables...
              </div>
            ) : tables.length === 0 ? (
              <div className={`rounded-2xl border border-dashed p-12 text-center text-sm ${borderCol} ${textSecondary}`}>
                No tables found
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {tableCards.map(({ table, order, state }) => {
                  const styles = tableStateStyles[state];

                  return (
                    <div
                      key={table.id}
                      className={`min-h-[196px] rounded-2xl border-2 p-5 shadow-sm transition-colors ${styles.border} ${styles.bg}`}
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-black uppercase text-slate-400">Table</div>
                          <div className={`text-2xl font-black leading-none ${state === "inactive" ? "text-slate-500" : "text-[#111827]"}`}>
                            {table.name}
                          </div>
                        </div>

                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${styles.badge}`}>
                          {styles.label}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-500">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100">
                            <UsersRound size={12} />
                          </span>
                          <span>{table.capacity} guests</span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-500">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100">
                            <MapPin size={12} />
                          </span>
                          <span className="capitalize">{table.zone}</span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-500">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100">
                            <QrCode size={12} />
                          </span>
                          <span className="truncate">
                            {table.qrToken ? `/qr/${table.qrToken}` : "No QR token"}
                          </span>
                        </div>
                      </div>

                      {order ? (
                        <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-black text-slate-700">{order.orderNumber || order.orderId}</span>
                            <span className="capitalize">{order.status}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-1">
                            <Clock3 size={12} />
                            {waitMinutes(order)} min
                          </div>
                        </div>
                      ) : (
                        <div className="mt-5 flex items-center justify-center">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-200 text-slate-300">
                            <Armchair size={19} />
                          </div>
                        </div>
                      )}

                      {state === "dirty" && order && (
                        <button
                          type="button"
                          onClick={() => clearTable(order)}
                          className="mt-4 w-full rounded-lg bg-[#F59E0B] px-4 py-2 text-xs font-black text-white"
                        >
                          Clear Table
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
                            className="flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 hover:border-emerald-200 hover:text-emerald-600"
                            title="Show QR code"
                          >
                            <QrCode size={14} />
                            QR
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => editTable(table)}
                          className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-xs font-black text-slate-600 hover:border-blue-200 hover:text-blue-600"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTable(table)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:text-red-600"
                          title="Delete table"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside className={`border-l px-6 py-6 ${borderCol} ${dark ? "bg-[#11141c]" : "bg-[#F4F6FA]"}`}>
            <div className={`mb-5 rounded-2xl border p-4 ${surface} ${borderCol}`}>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Table Setup
              </p>
              <p className={`mt-2 text-sm ${textSecondary}`}>
                Add a new table or use Edit on any table card to update its details.
              </p>
              <button
                type="button"
                onClick={openCreateTableModal}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-3 text-xs font-black text-white hover:bg-[#1D4ED8]"
              >
                <Plus size={15} />
                Add Table
              </button>
            </div>

            <div className={`my-6 h-px ${dark ? "bg-[#2a2f3d]" : "bg-slate-200"}`} />

            <div>
              <p className="mb-4 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Live Activity
              </p>

              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <div className={`rounded-xl border border-dashed p-4 text-xs ${borderCol} ${textSecondary}`}>
                    No live table activity yet
                  </div>
                ) : (
                  recentActivity.map((order) => (
                    <ActivityItem
                      key={order.id}
                      color={order.status === "served" ? "bg-[#FEF3C7]" : "bg-[#DBEAFE]"}
                      title={`${order.tableNo || order.table?.name || "Walk-in"} ${order.status}`}
                      time={`${waitMinutes(order)} min ago`}
                    />
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close table dialog"
            onClick={closeTableModal}
            className="absolute inset-0 bg-slate-950/30 animate-[tableModalBackdrop_180ms_ease-out]"
          />

          <div className={`relative max-h-[calc(100vh-32px)] w-full max-w-lg overflow-y-auto rounded-2xl border p-5 shadow-2xl animate-[tableModalIn_220ms_cubic-bezier(0.16,1,0.3,1)] ${surface} ${borderCol}`}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  {tableForm.id ? "Edit Table" : "Create Table"}
                </p>
                <h2 className={`mt-1 text-xl font-black ${textPrimary}`}>
                  {tableForm.id ? tableForm.name : "Add New Table"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeTableModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-[11px] font-black uppercase text-slate-400">Table Name</span>
                  <input
                    required
                    value={tableForm.name}
                    onChange={(event) => setTableForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="T5"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-[11px] font-black uppercase text-slate-400">Capacity</span>
                  <input
                    type="number"
                    min={1}
                    value={tableForm.capacity}
                    onChange={(event) => setTableForm((current) => ({ ...current, capacity: event.target.value }))}
                    placeholder="2"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                  />
                </label>
              </div>

              <label className="space-y-1.5">
                <span className="text-[11px] font-black uppercase text-slate-400">Zone</span>
                <select
                  value={tableForm.zone}
                  onChange={(event) =>
                    setTableForm((current) => ({ ...current, zone: event.target.value as TableZone }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                >
                  <option value="indoor">Indoor</option>
                  <option value="outdoor">Outdoor</option>
                  <option value="vip">VIP</option>
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-[11px] font-black uppercase text-slate-400">QR Token</span>
                <input
                  value={tableForm.qrToken}
                  onChange={(event) => setTableForm((current) => ({ ...current, qrToken: event.target.value }))}
                  placeholder="Optional, e.g. table-t-5"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600 ring-1 ring-slate-200">
                <span className="font-bold">Active table</span>
                <input
                  type="checkbox"
                  checked={tableForm.isActive}
                  onChange={(event) => setTableForm((current) => ({ ...current, isActive: event.target.checked }))}
                  className="h-5 w-5 accent-blue-600"
                />
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeTableModal}
                  className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-xs font-black text-white hover:bg-[#1D4ED8]">
                  {tableForm.id ? <Save size={15} /> : <Plus size={15} />}
                  {tableForm.id ? "Update Table" : "Save Table"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {qrTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close QR dialog"
            onClick={() => setQrTable(null)}
            className="absolute inset-0 bg-slate-950/30 animate-[tableModalBackdrop_180ms_ease-out]"
          />

          <div className={`relative w-full max-w-sm rounded-2xl border p-5 text-center shadow-2xl animate-[tableModalIn_220ms_cubic-bezier(0.16,1,0.3,1)] ${surface} ${borderCol}`}>
            <button
              type="button"
              onClick={() => setQrTable(null)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              title="Close"
            >
              <X size={16} />
            </button>

            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <QrCode size={21} />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">QR Demo</p>
            <h2 className={`mt-1 text-xl font-black ${textPrimary}`}>{qrTable.name}</h2>
            <p className={`mt-1 text-xs ${textSecondary}`}>Scan to open the public customer ordering page.</p>

            <div className="mx-auto my-5 flex w-fit rounded-2xl border border-slate-200 bg-white p-3">
              {qrImageFailed ? (
                <div className="flex h-56 w-56 flex-col items-center justify-center gap-3 rounded-xl bg-slate-50 px-4 text-center">
                  <QrCode size={34} className="text-slate-300" />
                  <div>
                    <div className="text-sm font-black text-slate-700">QR image not loaded</div>
                    <div className="mt-1 text-xs font-semibold text-slate-400">
                      Restart backend, then try again.
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={qrImageUrl(qrTable)}
                  alt={`QR code for ${qrTable.name}`}
                  className="h-56 w-56"
                  onError={() => setQrImageFailed(true)}
                />
              )}
            </div>

            <div className="mb-4 rounded-xl bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-500">
              <div className="truncate">{qrLink(qrTable)}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void copyQrLink(qrTable)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 hover:bg-slate-50"
              >
                Copy Link
              </button>
              <a
                href={`/qr/${qrTable.qrToken}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 items-center justify-center rounded-xl bg-[#2563EB] px-4 text-xs font-black text-white hover:bg-[#1D4ED8]"
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
      `}</style>
    </>
  );
}

function ActivityItem({
  color,
  title,
  time,
}: {
  color: string;
  title: string;
  time: string;
}) {
  return (
    <div className="flex gap-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color}`}>
        <Clock3 size={14} className="text-slate-600" />
      </div>

      <div>
        <div className="text-sm font-black text-slate-800">{title}</div>
        <div className="text-xs text-slate-400">{time}</div>
      </div>
    </div>
  );
}
