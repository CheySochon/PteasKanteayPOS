"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChefHat,
  Clock,
  Flame,
  RefreshCw,
} from "lucide-react";
import KdsOrderCard from "../../../components/KdsOrderCard";
import { getOrders, updateOrderStatus } from "../../../lib/api";
import { getSocket } from "../../../lib/socket";
import type { Order, OrderStatus } from "../../../lib/types";
import { useAutoDismiss } from "../../../lib/useAutoDismiss";
import { useAppTheme } from "../../../lib/theme";
import { useAppLanguage } from "../../../lib/language";

let globalAudioCtx: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === "suspended") {
    void globalAudioCtx.resume();
  }
  return globalAudioCtx;
}

function playKitchenBellSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(987.77, now);
    gain1.gain.setValueAtTime(0.5, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 1.2);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1318.51, now + 0.12);
    gain2.gain.setValueAtTime(0.6, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 1.6);
  } catch (e) {
    console.error("Kitchen audio chime error:", e);
  }
}

export default function AdminKitchenPage() {
  const [theme] = useAppTheme();
  const language = useAppLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useAutoDismiss(error, setError, 4000);
  useAutoDismiss(message, setMessage, 3000);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");

  const dark = theme === "dark";

  async function loadOrders(silent = false) {
    try {
      if (!silent) setRefreshing(true);
      const data = await getOrders();
      setOrders((prev) => {
        const prevIds = new Set(prev.map((o) => o.id));
        const hasNew = data.some((o) => !prevIds.has(o.id));
        if (hasNew && prev.length > 0) {
          playKitchenBellSound();
        }
        return data;
      });
    } catch (err: any) {
      if (!silent) setError(err?.message || "Failed to load kitchen orders");
    } finally {
      if (!silent) setRefreshing(false);
    }
  }

  useEffect(() => {
    loadOrders();
    const socket = getSocket();

    let reloadTimer: NodeJS.Timeout | null = null;
    const scheduleReload = (silent = true) => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        loadOrders(silent);
      }, 300);
    };

    function handleOrderEvent() {
      scheduleReload(true);
    }

    function handleNewOrder() {
      scheduleReload(true);
    }

    if (socket) {
      if (!socket.connected) {
        socket.connect();
      }
      socket.on("order:created", handleNewOrder);
      socket.on("order:updated", handleOrderEvent);
      socket.on("table:merged", handleOrderEvent);
      socket.on("table:moved", handleOrderEvent);
    }

    window.addEventListener("pos-order-change", handleOrderEvent);
    window.addEventListener("pos-table-change", handleOrderEvent);
    window.addEventListener("storage", handleOrderEvent);

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      if (socket) {
        socket.off("order:created", handleNewOrder);
        socket.off("order:updated", handleOrderEvent);
        socket.off("table:merged", handleOrderEvent);
        socket.off("table:moved", handleOrderEvent);
      }
      window.removeEventListener("pos-order-change", handleOrderEvent);
      window.removeEventListener("pos-table-change", handleOrderEvent);
      window.removeEventListener("storage", handleOrderEvent);
    };
  }, []);

  async function handleStatusChange(orderId: number, status: OrderStatus) {
    try {
      const updated = await updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (err: any) {
      setError(err?.message || "Failed to update status");
    }
  }

  const activeOrders = useMemo(() => {
    return orders.filter((o) => {
      const s = (o.status || "pending").toLowerCase();
      const hasItems = Array.isArray(o.items) && o.items.length > 0;
      return s !== "cancelled" && s !== "served" && s !== "ready" && s !== "completed" && hasItems;
    });
  }, [orders]);

  const pendingCount = useMemo(() => {
    return activeOrders.filter((o) => (o.status || "pending").toLowerCase() === "pending").length;
  }, [activeOrders]);

  const preparingCount = useMemo(() => {
    return activeOrders.filter((o) => (o.status || "pending").toLowerCase() === "preparing").length;
  }, [activeOrders]);

  const kitchenOrders = useMemo(() => {
    let rows = activeOrders;
    if (statusFilter !== "all") {
      rows = rows.filter((o) => (o.status || "pending").toLowerCase() === statusFilter);
    }
    return rows.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [activeOrders, statusFilter]);

  return (
    <div className={`flex-1 overflow-y-auto flex flex-col ${dark ? "bg-[#232333] text-slate-100" : "bg-[#f8faf9] text-slate-800"}`}>
      <main className="px-4 py-4 lg:px-6 space-y-4 flex-1 max-w-[1400px] w-full mx-auto">
        {/* Header Action Row matching screenshot */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          <div className="flex items-center gap-3.5">
            <h1 className={`text-2xl font-normal ${dark ? "text-slate-100" : "text-slate-800"}`}>
              {language === "km" ? "ផ្ទះបាយ" : "Kitchen"}
            </h1>
            <button
              type="button"
              onClick={() => loadOrders(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                dark
                  ? "bg-[#2b2c40] border-[#3b3c54] text-slate-300 hover:bg-[#34354e]"
                  : "bg-slate-100/90 border-slate-200/80 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin text-[#55a060]" : ""} />
              <span>{language === "km" ? "ថ្មីឡើងវិញ" : "Refresh"}</span>
            </button>
          </div>

          {/* Ticket Status Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-[#55a060] text-white shadow-xs"
                  : dark
                  ? "bg-[#2b2c40] border border-[#3b3c54] text-slate-300 hover:bg-[#34354e]"
                  : "bg-slate-100 text-slate-600 border border-slate-200/80 hover:bg-slate-200/80"
              }`}
            >
              {language === "km" ? `ទាំងអស់ (${activeOrders.length})` : `All (${activeOrders.length})`}
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === "pending"
                  ? "bg-amber-500 text-white shadow-xs"
                  : dark
                  ? "bg-[#2b2c40] border border-amber-900/50 text-amber-400 hover:bg-amber-950/30"
                  : "bg-amber-50 text-amber-600 border border-amber-200/60 hover:bg-amber-100/80"
              }`}
            >
              <Clock size={13} />
              {language === "km" ? `រង់ចាំ (${pendingCount})` : `Pending (${pendingCount})`}
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("preparing")}
              className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === "preparing"
                  ? "bg-blue-600 text-white shadow-xs"
                  : dark
                  ? "bg-[#2b2c40] border border-blue-900/50 text-blue-400 hover:bg-blue-950/30"
                  : "bg-blue-50 text-blue-600 border border-blue-200/60 hover:bg-blue-100/80"
              }`}
            >
              <Flame size={13} />
              {language === "km" ? `កំពុងធ្វើ (${preparingCount})` : `Preparing (${preparingCount})`}
            </button>
          </div>
        </div>

        {/* Order Cards Grid */}
        {refreshing && kitchenOrders.length === 0 ? (
          <KdsSkeleton dark={dark} />
        ) : kitchenOrders.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {kitchenOrders.map((order) => (
              <KdsOrderCard
                key={order.id}
                order={order}
                onUpdate={handleStatusChange}
              />
            ))}
          </div>
        ) : (
          <div className={`mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center transition-all ${
            dark ? "border-[#3b3c54] bg-[#2b2c40]" : "border-slate-200 bg-white"
          }`}>
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl mb-4 border ${
              dark ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/50" : "bg-emerald-50 text-emerald-600 border-emerald-100"
            }`}>
              <ChefHat size={30} strokeWidth={1.8} />
            </div>
            <h3 className={`text-base font-bold mb-1 ${dark ? "text-slate-100" : "text-slate-800"}`}>
              {language === "km" ? "មិនមានការបញ្ជាទិញក្នុងផ្ទះបាយទេ" : "No Active Kitchen Orders"}
            </h3>
            <p className={`text-xs max-w-md leading-relaxed ${dark ? "text-slate-400" : "text-slate-500"}`}>
              {language === "km" 
                ? "នៅពេលមានការបញ្ជាទិញថ្មីពីកន្លែងលក់ (POS) វានឹងបង្ហាញនៅលើអេក្រង់នេះដោយស្វ័យប្រវត្តិ។" 
                : "New customer orders sent from POS will automatically appear here in real-time."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function KdsSkeleton({ dark }: { dark?: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-start">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className={`flex flex-col justify-between rounded-2xl p-4.5 min-h-[175px] border animate-pulse ${
            dark ? "bg-[#2b2c40] border-[#3b3c54]" : "bg-white border-slate-200/80"
          }`}
        >
          <div>
            <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700" />
            </div>

            <div className="space-y-3.5 py-1">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-28 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
