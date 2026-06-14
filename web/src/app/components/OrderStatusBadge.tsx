import type { OrderStatus } from "../lib/types";

const styles: Record<OrderStatus, string> = {
  pending: "bg-blue-50 text-blue-700 before:bg-blue-500",
  accepted: "bg-indigo-50 text-indigo-700 before:bg-indigo-500",
  preparing: "bg-amber-50 text-amber-700 before:bg-amber-500",
  ready: "bg-blue-50 text-blue-700 before:bg-blue-500",
  served: "bg-emerald-50 text-emerald-700 before:bg-emerald-500",
  completed: "bg-zinc-100 text-zinc-700 before:bg-zinc-500",
  cancelled: "bg-red-50 text-red-700 before:bg-red-500",
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={`inline-flex h-7 w-28 items-center justify-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold leading-none before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full ${styles[status] || styles.pending}`}>
      {label}
    </span>
  );
}
