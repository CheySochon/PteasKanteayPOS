"use client";

import { useAppTheme } from "../lib/theme";
import type { OrderStatus } from "../lib/types";

const lightStyles: Record<OrderStatus, string> = {
  pending: "bg-blue-50 text-blue-700 before:bg-blue-500",
  accepted: "bg-indigo-50 text-indigo-700 before:bg-indigo-500",
  preparing: "bg-amber-50 text-amber-700 before:bg-amber-500",
  ready: "bg-blue-50 text-blue-700 before:bg-blue-500",
  served: "bg-emerald-50 text-emerald-700 before:bg-emerald-500",
  completed: "bg-[#e2e8f0] text-slate-700 before:bg-slate-500",
  cancelled: "bg-red-50 text-red-700 before:bg-red-500",
};

const darkStyles: Record<OrderStatus, string> = {
  pending: "bg-blue-500/10 text-blue-400 before:bg-blue-400 border border-blue-500/20",
  accepted: "bg-indigo-500/10 text-indigo-400 before:bg-indigo-400 border border-indigo-500/20",
  preparing: "bg-amber-500/10 text-amber-400 before:bg-amber-400 border border-amber-500/20",
  ready: "bg-blue-500/10 text-blue-400 before:bg-blue-400 border border-blue-500/20",
  served: "bg-emerald-500/10 text-emerald-400 before:bg-emerald-400 border border-emerald-500/20",
  completed: "bg-slate-700/60 text-slate-300 before:bg-slate-400 border border-slate-600/30",
  cancelled: "bg-red-500/10 text-red-400 before:bg-red-400 border border-red-500/20",
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
