"use client";

import { useState, memo } from "react";
import { Package, Armchair, MoreVertical, Clock } from "lucide-react";
import type { Order, OrderStatus } from "../lib/types";
import AnimatedToast from "./AnimatedToast";

function formatTokenNo(order: Order) {
  if (order.id) {
    return `#${order.id}`;
  }
  const raw = order.orderNumber || order.orderId || `#${order.id}`;
  if (typeof raw === "string" && raw.startsWith("ORD-")) {
    const parts = raw.split("-");
    return `#${parts[parts.length - 1]}`;
  }
  return String(raw);
}

const KdsOrderCard = memo(function KdsOrderCard({
  order,
  onUpdate,
}: {
  order: Order;
  onUpdate: (id: number, status: OrderStatus) => void;
}) {
  const [itemStatuses, setItemStatuses] = useState<Record<number, "pending" | "preparing" | "completed">>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pos_kds_item_statuses");
        return stored ? JSON.parse(stored) : {};
      } catch (e) {}
    }
    return {};
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const tokenNo = formatTokenNo(order);
  const rawTable = order.tableNo || order.table?.name;
  const isTakeaway = order.orderType?.toLowerCase().includes("takeaway") || !rawTable;
  const orderTypeLabel = isTakeaway ? "WALKIN" : rawTable || "null";

  function handleItemAction(itemId: number, currentItemStatus: string, itemName: string) {
    const nextStatus: "pending" | "preparing" | "completed" = currentItemStatus === "completed" ? "preparing" : "completed";
    
    setItemStatuses((prev) => {
      const nextMap = { ...prev, [itemId]: nextStatus };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("pos_kds_item_statuses", JSON.stringify(nextMap));
          window.dispatchEvent(new Event("pos-item-status-change"));
        } catch (e) {}
      }
      return nextMap;
    });

    if (nextStatus === "preparing") {
      setToastMessage(`Started making "${itemName}" (Order ${tokenNo})`);
    } else {
      setToastMessage(`Completed "${itemName}" (Order ${tokenNo})`);
    }

    if (order.status === "pending" && nextStatus === "preparing") {
      onUpdate(order.id, "preparing");
    }

    const allItems = order.items || [];
    const willBeAllCompleted = allItems.every((item) => {
      const status = item.id === itemId ? nextStatus : (itemStatuses[item.id] || (order.status === "preparing" ? "preparing" : "pending"));
      return status === "completed";
    });

    if (willBeAllCompleted) {
      onUpdate(order.id, "ready");
    }
  }

  return (
    <article className="flex w-full flex-col justify-between rounded-2xl bg-white dark:bg-[#2b2c40] p-4.5 pb-5 min-h-[175px] shadow-none border border-slate-200/80 dark:border-[#3b3c54] transition-all">
      <div>
        {/* Card Header matching screenshot */}
        <div className="flex items-center justify-between gap-2 pb-3 mb-3.5 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {isTakeaway ? <Package size={20} /> : <Armchair size={20} />}
            </div>
            <span className="text-sm font-normal text-slate-800 dark:text-slate-100 tracking-tight">
              {orderTypeLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-normal text-slate-600 dark:text-slate-300">
              Token: <span className="text-sm font-normal text-slate-900 dark:text-white">{tokenNo}</span>
            </span>
            <button
              type="button"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
            >
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        {/* Itemized Order List matching screenshot */}
        <div className="space-y-3 py-1 min-h-[95px]">
          {(order.items || []).length === 0 ? (
            <div className="py-4 text-center text-xs font-normal text-slate-400">
              Standard Order Ticket
            </div>
          ) : (
            order.items?.map((item) => {
              const currentStatus = itemStatuses[item.id] || (order.status === "preparing" ? "preparing" : "pending");
              const isCompleted = currentStatus === "completed";
              const isPreparing = currentStatus === "preparing";

              return (
                <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className={`font-normal ${isCompleted ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-200"}`}>
                      {item.product?.name || item.name || `Item #${item.productId}`} <span className="font-normal text-slate-500">x {item.quantity}</span>
                    </div>

                    {item.notes && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                        <Clock size={12} className="shrink-0" />
                        <span>Notes: {item.notes}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleItemAction(item.id, currentStatus, item.product?.name || item.name || `Item #${item.productId}`)}
                    className={`shrink-0 rounded-full px-3.5 py-1 text-xs font-semibold transition-all border cursor-pointer ${
                      isCompleted
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                        : "bg-[#f2f4f3] dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-[#c6e4cc] dark:border-slate-700 hover:bg-[#e4eae6] active:scale-95"
                    }`}
                  >
                    {isCompleted ? "Complete" : isPreparing ? "Complete" : "Start Making"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Animated Pill Toast Popup (Matching Table Page Design) */}
      {toastMessage && (
        <AnimatedToast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
          type="success"
          duration={3500}
        />
      )}
    </article>
  );
});

export default KdsOrderCard;
