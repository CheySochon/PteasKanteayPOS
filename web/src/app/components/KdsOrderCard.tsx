"use client";

import type { Order, OrderStatus } from "../lib/types";
import OrderStatusBadge from "./OrderStatusBadge";

const nextActions: Partial<Record<OrderStatus, { label: string; status: OrderStatus }>> = {
  pending: { label: "Accept", status: "accepted" },
  accepted: { label: "Start Preparing", status: "preparing" },
  preparing: { label: "Mark Ready", status: "ready" },
  ready: { label: "Mark Served", status: "served" },
};

export default function KdsOrderCard({
  order,
  onUpdate,
}: {
  order: Order;
  onUpdate: (id: number, status: OrderStatus) => void;
}) {
  const action = nextActions[order.status];

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="text-sm font-bold text-gray-900">{order.orderNumber || order.orderId}</div>
          <div className="text-xs text-gray-500">{order.tableNo || order.table?.name || "Walk-in"}</div>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="space-y-2">
        {(order.items || []).length === 0 ? (
          <div className="text-xs text-gray-400">No item details</div>
        ) : order.items?.map((item) => (
          <div key={item.id} className="flex justify-between rounded-md bg-gray-50 px-3 py-2 text-xs">
            <span>{item.quantity}x {item.product?.name || `Product #${item.productId}`}</span>
            <span>${Number(item.totalPrice || 0).toFixed(2)}</span>
          </div>
        ))}
      </div>
      {action && (
        <button onClick={() => onUpdate(order.id, action.status)} className="mt-4 w-full rounded-lg bg-[#1D9E75] py-2 text-xs font-bold text-white">
          {action.label}
        </button>
      )}
    </div>
  );
}
