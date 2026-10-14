"use client";

import { useState, useEffect, memo } from "react";
import { Package, Armchair, MoreVertical, Clock } from "lucide-react";
import type { Order, OrderStatus } from "../lib/types";
import AnimatedToast from "./AnimatedToast";
import { useAppTheme } from "../lib/theme";
import { getSocket } from "../lib/socket";

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

export function formatKdsTableLabel(order: Order): string {
  const rawTable = order.tableNo || order.table?.name || (order as any).tableName || (order as any).table_name || "";
  const isTakeaway = orderTypeLabelIsWalkin(order);
  if (isTakeaway && !rawTable) return "WALKIN";

  const notes = order.notes || "";

  if (rawTable && (rawTable.includes("&") || rawTable.includes("+"))) {
    return rawTable;
  }

  const cleanName = (str: string) => {
    const s = str.trim();
    if (/^\d+$/.test(s)) return `T${s}`;
    if (s.toLowerCase().startsWith("table ")) return `T${s.slice(6).trim()}`;
    return s;
  };

  const mergeMatch = notes.match(/Merged (?:with|into|from) ([^)\n,]+)/i) || notes.match(/Joined (?:with|into|from) ([^)\n,]+)/i);
  if (mergeMatch && mergeMatch[1]) {
    const otherTable = cleanName(mergeMatch[1]);
    const baseTable = cleanName(rawTable || "Table");

    if (otherTable.toLowerCase() !== baseTable.toLowerCase()) {
      const numBase = parseInt(baseTable.replace(/\D/g, ""), 10);
      const numOther = parseInt(otherTable.replace(/\D/g, ""), 10);

      if (!isNaN(numBase) && !isNaN(numOther)) {
        const sorted = [numBase, numOther].sort((a, b) => a - b);
        return `T${sorted[0]} & T${sorted[1]}`;
      }
      return `${baseTable} & ${otherTable}`;
    }
  }

  if (rawTable) {
    return cleanName(rawTable);
  }

  return "WALKIN";
}

function orderTypeLabelIsWalkin(order: Order): boolean {
  const rawTable = order.tableNo || order.table?.name || (order as any).tableName || (order as any).table_name || "";
  return order.orderType?.toLowerCase().includes("takeaway") || (!rawTable && !order.notes?.toLowerCase().includes("merged"));
}

const KdsOrderCard = memo(function KdsOrderCard({
  order,
  onUpdate,
}: {
  order: Order;
  onUpdate: (id: number, status: OrderStatus) => void;
}) {
  const [theme] = useAppTheme();
  const dark = theme === "dark";
  const [itemStatuses, setItemStatuses] = useState<Record<string | number, "pending" | "preparing" | "completed">>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pos_kds_item_statuses");
        return stored ? JSON.parse(stored) : {};
      } catch (e) {}
    }
    return {};
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const syncItemStatuses = () => {
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("pos_kds_item_statuses");
          if (stored) setItemStatuses(JSON.parse(stored));
        } catch (e) {}
      }
    };

    window.addEventListener("pos-item-status-change", syncItemStatuses);
    window.addEventListener("storage", syncItemStatuses);

    const socket = getSocket();
    if (socket) {
      socket.on("kds:item_updated", (data: any) => {
        if (!data) return;
        setItemStatuses((prev) => {
          const next = { ...prev };
          if (data.itemId) next[data.itemId] = data.status;
          if (data.orderId && data.productId) next[`${data.orderId}-${data.productId}`] = data.status;
          return next;
        });
      });
    }

    return () => {
      window.removeEventListener("pos-item-status-change", syncItemStatuses);
      window.removeEventListener("storage", syncItemStatuses);
      if (socket) {
        socket.off("kds:item_updated");
      }
    };
  }, []);

  const tokenNo = formatTokenNo(order);
  const orderTypeLabel = formatKdsTableLabel(order);
  const isTakeaway = orderTypeLabel === "WALKIN";

  function handleItemAction(itemId: number, currentItemStatus: string, itemName: string, productId?: number) {
    const nextStatus: "pending" | "preparing" | "completed" =
      currentItemStatus === "pending" ? "preparing" :
      currentItemStatus === "preparing" ? "completed" :
      "preparing";
    
    const itemKey = productId ? `${order.id}-${productId}` : null;

    setItemStatuses((prev) => {
      const nextMap = { ...prev };
      if (itemId) nextMap[itemId] = nextStatus;
      if (itemKey) nextMap[itemKey] = nextStatus;

      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("pos_kds_item_statuses");
          const globalObj = raw ? JSON.parse(raw) : {};
          if (itemId) globalObj[itemId] = nextStatus;
          if (itemKey) globalObj[itemKey] = nextStatus;
          localStorage.setItem("pos_kds_item_statuses", JSON.stringify(globalObj));
          window.dispatchEvent(new Event("pos-item-status-change"));
        } catch (e) {}
      }
      return nextMap;
    });

    const socket = getSocket();
    if (socket) {
      socket.emit("kds:item_updated", {
        orderId: order.id,
        itemId,
        productId,
        status: nextStatus,
      });
    }

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
      const key = `${order.id}-${item.productId}`;
      const status = (item.id === itemId || (productId && item.productId === productId))
        ? nextStatus
        : ((item.id && itemStatuses[item.id]) || itemStatuses[key] || (order.status === "preparing" ? "preparing" : "pending"));
      return status === "completed";
    });

    if (willBeAllCompleted) {
      onUpdate(order.id, "ready");
    }
  }

  return (
    <article className={`flex w-full flex-col justify-between rounded-2xl p-4.5 pb-5 min-h-[175px] shadow-none border transition-all ${
      dark ? "bg-[#2b2c40] border-[#3b3c54]" : "bg-white border-slate-200/80"
    }`}>
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
              ID: <span className="text-sm font-normal text-slate-900 dark:text-white">{tokenNo}</span>
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
            order.items?.map((item, idx) => {
              const itemKey = `${order.id}-${item.productId}`;
              const currentStatus =
                (item.id && itemStatuses[item.id]) ||
                itemStatuses[itemKey] ||
                (item as any).status ||
                (order.status === "ready" || order.status === "served" || order.status === "completed"
                  ? "completed"
                  : order.status === "preparing"
                  ? "preparing"
                  : "pending");
              const isCompleted = currentStatus === "completed";
              const isPreparing = currentStatus === "preparing";

              return (
                <div key={item.id ? `kds-item-${item.id}` : `kds-item-idx-${idx}`} className="flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className={`font-normal flex items-center gap-1.5 flex-wrap ${isCompleted ? "text-slate-400 opacity-70" : "text-slate-800 dark:text-slate-200"}`}>
                      <span className={isCompleted ? "line-through text-slate-400" : ""}>
                        {item.product?.name || item.name || `Item #${item.productId}`}
                      </span>
                      <span className="font-normal text-slate-500">x {item.quantity}</span>
                      {isCompleted && (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 no-underline shrink-0">
                          ✓ រួចរាល់
                        </span>
                      )}
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
                    onClick={() => handleItemAction(item.id, currentStatus, item.product?.name || item.name || `Item #${item.productId}`, item.productId)}
                    className={`shrink-0 rounded-full px-3.5 py-1 text-xs font-semibold transition-all border cursor-pointer ${
                      isCompleted
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                        : isPreparing
                        ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100"
                        : "bg-[#f2f4f3] dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-[#c6e4cc] dark:border-slate-700 hover:bg-[#e4eae6] active:scale-95"
                    }`}
                  >
                    {isCompleted ? "Completed (រួចរាល់)" : isPreparing ? "Complete (ធ្វើរួច)" : "Start Making"}
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
