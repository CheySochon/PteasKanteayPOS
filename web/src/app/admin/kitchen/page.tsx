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

      <main className="p-4 sm:p-6 space-y-6 flex-1 max-w-[1400px] w-full mx-auto">
        {/* Header Action Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#55a060]/10 dark:bg-emerald-500/20 text-[#55a060] dark:text-emerald-400 flex items-center justify-center font-bold">
              <ChefHat size={22} />
            </div>
            <div>
              <h2 className={`text-xl font-normal shrink-0 ${dark ? "text-slate-100" : "text-slate-800"}`}>
                {language === "km" ? "កន្លែងធ្វើម្ហូបរហ័ស" : "Live Kitchen Queue"}
              </h2>
              <p className={`text-xs font-medium ${dark ? "text-slate-400" : "text-slate-500"}`}>
                {kitchenOrders.length} {language === "km" ? "ការបញ្ជាទិញកំពុងរង់ចាំ" : "active orders in queue"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={loadOrders}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                dark
                  ? "bg-[#2b2c40] border border-[#3b3c54] text-slate-300 hover:bg-[#34354e]"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin text-[#0F522B]" : ""} />
              <span>{language === "km" ? "ថ្មីឡើងវិញ" : "Refresh"}</span>
            </button>
          </div>
        </div>

        {/* Order Cards Grid */}
        {kitchenOrders.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border ${
            dark ? "bg-[#2b2c40] border-[#3b3c54]" : "bg-white border-slate-200/80"
          }`}>
            <div className={`h-14 w-14 rounded-full flex items-center justify-center mb-3.5 ${
              dark ? "bg-emerald-500/10 text-emerald-400" : "bg-[#55a060]/10 text-[#55a060]"
            }`}>
              <CheckCircle2 size={28} />
            </div>
            <h3 className={`text-base font-bold ${dark ? "text-slate-100" : "text-slate-800"}`}>
              {language === "km" ? "គ្មានការបញ្ជាទិញរង់ចាំឡើយ" : "Kitchen Queue is Clear"}
            </h3>
            <p className={`text-xs font-medium mt-1 ${dark ? "text-slate-400" : "text-slate-500"}`}>
              {language === "km" ? "រាល់ការបញ្ជាទិញទាំងអស់ត្រូវបានធ្វើរួចរាល់" : "All orders have been prepared and served."}
            </p>
          </div>
        ) : (
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
