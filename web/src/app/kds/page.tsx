"use client";

import { useEffect, useMemo, useState } from "react";
import KdsOrderCard from "../components/KdsOrderCard";
import { getOrders, updateOrderStatus } from "../lib/api";
import { getSocket } from "../lib/socket";
import type { Order, OrderStatus } from "../lib/types";
import { useAutoDismiss } from "../lib/useAutoDismiss";

const visibleStatuses: OrderStatus[] = ["pending", "accepted", "preparing", "ready"];

export default function KdsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("");
  useAutoDismiss(message, setMessage);

  useEffect(() => {
    getOrders().then(setOrders).catch((err) => setMessage(err.message));

    const socket = getSocket();
    if (!socket) return;

    const upsert = (order: Order) => {
      setOrders((current) => {
        const exists = current.some((entry) => entry.id === order.id);
        return exists ? current.map((entry) => entry.id === order.id ? order : entry) : [order, ...current];
      });
    };

    socket.on("order:created", upsert);
    socket.on("order:updated", upsert);
  return () => {
      socket.off("order:created", upsert);
      socket.off("order:updated", upsert);
    };
  }, []);

  const activeOrders = useMemo(() => orders.filter((order) => visibleStatuses.includes(order.status)), [orders]);

  async function changeStatus(id: number, status: OrderStatus) {
    try {
      const updated = await updateOrderStatus(id, status);
      setOrders((current) => current.map((order) => order.id === id ? updated : order));
    } catch (err) {
      setMessage(err instanceof Error ? `${err.message}. Login as Admin, Cashier, or Staff to update KDS.` : "Unable to update order");
    }
  }

  return (
    <main className="min-h-screen bg-[#111827] p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Kitchen Display</h1>
          <p className="text-sm text-white/50">Pending, accepted, preparing, and ready orders.</p>
        </div>
        <div className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white">{activeOrders.length} active</div>
      </div>
      {message && <div className="mb-4 rounded-lg bg-amber-100 p-3 text-sm text-amber-800">{message}</div>}
      {activeOrders.length === 0 ? (
        <div className="rounded-lg border border-white/10 p-10 text-center text-sm text-white/50">No active kitchen orders</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {activeOrders.map((order) => <KdsOrderCard key={order.id} order={order} onUpdate={changeStatus} />)}
        </div>
      )}
    </main>
  );
}
