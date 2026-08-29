"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Flame,
  RefreshCw,
} from "lucide-react";
import TopBar from "../../../components/TopBar";
import KdsOrderCard from "../../../components/KdsOrderCard";
import { getOrders, updateOrderStatus } from "../../../lib/api";
import { getSocket } from "../../../lib/socket";
import type { Order, OrderStatus } from "../../../lib/types";
import { useAutoDismiss } from "../../../lib/useAutoDismiss";
import { useAppTheme } from "../../../lib/theme";
import { useAppLanguage, setAppLanguage } from "../../../lib/language";

const visibleStatuses: OrderStatus[] = ["pending", "accepted", "preparing", "ready"];

export default function AdminKitchenPage() {
  const [theme] = useAppTheme();
  const language = useAppLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useAutoDismiss(error, setError, 4000);
  useAutoDismiss(message, setMessage, 3000);
  const [refreshing, setRefreshing] = useState(false);

  const dark = theme === "dark";

  async function loadOrders() {
    try {
      setRefreshing(true);
      const data = await getOrders();
      setOrders(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load kitchen orders");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadOrders();
    const socket = getSocket();

    function handleOrderEvent() {
      loadOrders();
    }

    if (socket) {
      if (!socket.connected) {
        socket.connect();
      }
      socket.on("order:created", handleOrderEvent);
      socket.on("order:updated", handleOrderEvent);
      socket.on("table:merged", handleOrderEvent);
      socket.on("table:moved", handleOrderEvent);
    }

    window.addEventListener("pos-order-change", handleOrderEvent);
    window.addEventListener("pos-table-change", handleOrderEvent);
    window.addEventListener("storage", handleOrderEvent);

    return () => {
      if (socket) {
        socket.off("order:created", handleOrderEvent);
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

  const kitchenOrders = useMemo(() => {
    return orders
      .filter((o) => {
        const s = (o.status || "pending").toLowerCase();
        const hasItems = Array.isArray(o.items) && o.items.length > 0;
        return s !== "cancelled" && s !== "served" && s !== "ready" && s !== "completed" && hasItems;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [orders]);

  return (
    <div className={`flex-1 overflow-y-auto flex flex-col ${dark ? "bg-[#232333] text-slate-100" : "bg-[#f8faf9] text-slate-800"}`}>

      <main className="px-4 py-4 lg:px-6 space-y-4 flex-1 max-w-[1400px] w-full mx-auto">
        {/* Header Action Row matching screenshot */}
        <div className="flex items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3.5">
            <h1 className={`text-2xl font-normal ${dark ? "text-slate-100" : "text-slate-800"}`}>
              {language === "km" ? "ផ្ទះបាយ" : "Kitchen"}
            </h1>
            <button
              type="button"
              onClick={loadOrders}
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
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-[#3b3c54] bg-white dark:bg-[#2b2c40] p-12 text-center transition-all">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-4 border border-emerald-100 dark:border-emerald-900/50">
              <ChefHat size={30} strokeWidth={1.8} />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
              {language === "km" ? "មិនមានការបញ្ជាទិញក្នុងផ្ទះបាយទេ" : "No Active Kitchen Orders"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
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
