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

const visibleStatuses: OrderStatus[] = ["pending", "preparing"];

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
      socket.on("order:created", handleOrderEvent);
      socket.on("order:updated", handleOrderEvent);
    }

    return () => {
      if (socket) {
        socket.off("order:created", handleOrderEvent);
        socket.off("order:updated", handleOrderEvent);
      }
    };
  }, []);

  async function handleStatusChange(orderId: number, status: OrderStatus) {
    try {
      const updated = await updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      setMessage(language === "km" ? "ប្តូរបរិមាណ/ស្ថានភាពជោគជ័យ" : "Order status updated!");
    } catch (err: any) {
      setError(err?.message || "Failed to update status");
    }
  }

  const kitchenOrders = useMemo(() => {
    return orders
      .filter((o) => visibleStatuses.includes(o.status))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [orders]);

  return (
    <div className={`flex-1 overflow-y-auto flex flex-col ${dark ? "bg-[#232333] text-slate-100" : "bg-white text-slate-800"}`}>
      <TopBar
        title={language === "km" ? "ផ្ទះបាយ (Kitchen)" : "Kitchen Display"}
        subtitle={language === "km" ? "គ្រប់គ្រង និងតាមដានការបញ្ជាទិញក្នុងផ្ទះបាយ" : "Live kitchen order queue and preparation status"}
        language={language}
        onLanguageChange={setAppLanguage}
        notifications={[]}
        dark={dark}
      />

      <main className="px-3.5 sm:px-4 pt-2.5 pb-5 space-y-4 flex-1 max-w-[1720px] w-full mx-auto">
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
        {kitchenOrders.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {kitchenOrders.map((order) => (
              <KdsOrderCard
                key={order.id}
                order={order}
                onUpdate={handleStatusChange}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
