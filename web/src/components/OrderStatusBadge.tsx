"use client";

import { useAppTheme } from "../lib/theme";
import type { OrderStatus } from "../lib/types";

const lightStyles: Record<OrderStatus, string> = {
  pending: "bg-green-50 text-green-700 before:bg-green-500",
  accepted: "bg-indigo-50 text-indigo-700 before:bg-indigo-500",
  preparing: "bg-amber-50 text-amber-700 before:bg-amber-500",
  ready: "bg-sky-50 text-sky-700 before:bg-sky-500",
  served: "bg-sky-50 text-sky-700 before:bg-sky-500",
  completed: "bg-emerald-50 text-emerald-700 before:bg-emerald-500",
  cancelled: "bg-rose-50 text-rose-700 before:bg-rose-500",
};

const darkStyles: Record<OrderStatus, string> = {
  pending: "bg-green-500/10 text-green-400 before:bg-green-400 border border-green-500/20",
  accepted: "bg-indigo-500/10 text-indigo-400 before:bg-indigo-400 border border-indigo-500/20",
  preparing: "bg-amber-500/10 text-amber-400 before:bg-amber-400 border border-amber-500/20",
  ready: "bg-sky-500/10 text-sky-400 before:bg-sky-400 border border-sky-500/20",
  served: "bg-sky-500/10 text-sky-400 before:bg-sky-400 border border-sky-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 before:bg-emerald-400 border border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-400 before:bg-rose-400 border border-rose-500/20",
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const [theme] = useAppTheme();
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  const dark = theme === "dark";
  const styles = dark ? darkStyles : lightStyles;

  return (
    <span className={`inline-flex h-7 w-28 items-center justify-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold leading-none before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full ${styles[status] || styles.pending}`}>
      {label}
    </span>
  );
}
