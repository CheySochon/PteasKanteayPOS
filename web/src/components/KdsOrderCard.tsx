"use client";

import { useState } from "react";
import { Clock, Check, ChefHat, AlertCircle, CheckCircle2, Flame, UtensilsCrossed } from "lucide-react";
import type { Order, OrderStatus } from "../lib/types";

const statusConfig: Record<
  OrderStatus,
  { label: string; bg: string; text: string; actionLabel: string; nextStatus?: OrderStatus; icon: any }
> = {
  pending: {
    label: "Pending",
    bg: "bg-[#ff9f43]/10 text-[#ff9f43]",
    text: "text-[#ff9f43]",
    actionLabel: "Accept Order",
    nextStatus: "accepted",
    icon: Clock,
  },
  accepted: {
    label: "Accepted",
    bg: "bg-[#696cff]/10 text-[#696cff]",
    text: "text-[#696cff]",
    actionLabel: "Start Preparing 🍳",
    nextStatus: "preparing",
    icon: Flame,
  },
  preparing: {
    label: "Preparing",
    bg: "bg-[#03c3ec]/10 text-[#03c3ec]",
    text: "text-[#03c3ec]",
    actionLabel: "Mark Ready 🔔",
    nextStatus: "ready",
    icon: ChefHat,
  },
  ready: {
    label: "Ready for Pickup",
    bg: "bg-[#71dd37]/10 text-[#71dd37]",
    text: "text-[#71dd37]",
    actionLabel: "Complete Order ✅",
    nextStatus: "served",
    icon: CheckCircle2,
  },
  served: {
    label: "Served",
    bg: "bg-slate-500/10 text-slate-500",
    text: "text-slate-500",
    actionLabel: "Completed",
    icon: CheckCircle2,
  },
  completed: {
    label: "Completed",
    bg: "bg-slate-500/10 text-slate-500",
    text: "text-slate-500",
    actionLabel: "Completed",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-[#ff3e1d]/10 text-[#ff3e1d]",
    text: "text-[#ff3e1d]",
    actionLabel: "Cancelled",
    icon: AlertCircle,
  },
};

function getElapsedMinutes(createdAt: string | Date) {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / 60000));
}

function formatTicketNumber(order: Order) {
  const raw = order.orderNumber || order.orderId || `#${order.id}`;
  if (raw.startsWith("ORD-")) {
    const parts = raw.split("-");
    const lastPart = parts[parts.length - 1];
    return `#${lastPart}`;
  }
  return raw;
}

export default function KdsOrderCard({
  order,
  onUpdate,
}: {
  order: Order;
  onUpdate: (id: number, status: OrderStatus) => void;
}) {
  const [completedItems, setCompletedItems] = useState<Record<number, boolean>>({});

  const elapsed = getElapsedMinutes(order.createdAt);
  const config = statusConfig[order.status] || statusConfig.pending;
  const IconComponent = config.icon;

  const isOverdue = elapsed >= 15;
  const isWarning = elapsed >= 10 && elapsed < 15;
  const shortTicketNo = formatTicketNumber(order);

  function toggleItem(itemId: number) {
    setCompletedItems((current) => ({
      ...current,
      [itemId]: !current[itemId],
    }));
  }

  return (
    <article className="group relative flex w-full max-w-[280px] flex-col justify-between overflow-hidden rounded-xl bg-white dark:bg-[#2b2c40] p-3.5 shadow-[0_2px_6px_0_rgba(67,89,113,0.12)] dark:shadow-[0_2px_6px_0_rgba(0,0,0,0.2)] border border-slate-200/80 dark:border-[#4e4f6e] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#696cff]/15 hover:border-[#696cff]/30">
      {/* Top Accent Color Bar */}
      <div className={`absolute inset-x-0 top-0 h-1 ${isOverdue ? "bg-[#ff3e1d] animate-pulse" : "bg-[#696cff]"}`} />

      <div>
        {/* Compact Ticket Header */}
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-[#3a3b53]">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-[#566a7f] dark:text-[#c9d4ea] tracking-tight">
                {shortTicketNo}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${config.bg}`}>
                <IconComponent size={11} />
                {config.label}
              </span>
            </div>

            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-[#8592a3]">
              <span className="inline-flex items-center rounded bg-slate-100 dark:bg-[#34355a] px-1.5 py-0.5 text-[10px] text-[#566a7f] dark:text-slate-300">
                {order.tableNo || order.table?.name || "Walk-in"}
              </span>
              <span>•</span>
              <span className="uppercase tracking-wider text-[10px]">{order.orderType || "Dine-in"}</span>
            </div>
          </div>

          {/* Wait Time Timer */}
          <div
            className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-black shadow-sm shrink-0 ${
              isOverdue
                ? "bg-[#ff3e1d] text-white animate-bounce"
                : isWarning
                ? "bg-[#ff9f43]/20 text-[#ff9f43]"
                : "bg-slate-100 dark:bg-[#34355a] text-[#566a7f] dark:text-slate-200"
            }`}
            title="Elapsed wait time"
          >
            <Clock size={12} />
            <span>{elapsed}m</span>
          </div>
        </div>

        {/* Compact Itemized Order List */}
        <div className="mt-3 space-y-1.5 min-h-[70px]">
          {(order.items || []).length === 0 ? (
            <div className="py-5 text-center flex flex-col items-center justify-center gap-1 text-[#a1acb8] bg-[#f8fafc] dark:bg-[#232333] rounded-lg border border-dashed border-slate-200 dark:border-[#3a3b53]">
              <UtensilsCrossed size={16} className="opacity-40" />
              <span className="text-[11px] font-bold">Standard Order Ticket</span>
              <span className="text-[10px] text-slate-400">Items preparing at station</span>
            </div>
          ) : (
            order.items?.map((item) => {
              const isChecked = Boolean(completedItems[item.id]);

              return (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`flex items-center justify-between rounded-lg p-2 cursor-pointer transition-all border ${
                    isChecked
                      ? "bg-[#71dd37]/10 border-[#71dd37]/30 text-slate-400 line-through"
                      : "bg-[#f8fafc] dark:bg-[#232333] border-slate-200/80 dark:border-[#34355a] hover:border-[#696cff]/30"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-black ${
                      isChecked
                        ? "bg-[#71dd37] text-white"
                        : "bg-[#696cff]/10 text-[#696cff] dark:bg-[#696cff]/20 dark:text-[#8587ff]"
                    }`}>
                      {isChecked ? <Check size={12} /> : `${item.quantity}x`}
                    </span>
                    <span className="text-xs font-bold text-[#566a7f] dark:text-slate-200 truncate">
                      {item.product?.name || item.name || `Item #${item.productId}`}
                    </span>
                  </div>

                  {item.notes && (
                    <span className="text-[10px] font-bold text-[#ff9f43] bg-[#ff9f43]/10 px-1.5 py-0.5 rounded truncate max-w-[90px]">
                      {item.notes}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sleek Bump Button Footer */}
      {config.nextStatus && (
        <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-[#3a3b53]">
          <button
            type="button"
            onClick={() => onUpdate(order.id, config.nextStatus!)}
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-[#696cff] px-3 text-xs font-bold text-white shadow-sm shadow-[#696cff]/20 hover:bg-[#5f61e6] active:scale-95 transition-all"
          >
            {config.actionLabel}
          </button>
        </div>
      )}
    </article>
  );
}
