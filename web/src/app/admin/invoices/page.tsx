"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Check,
  FileText,
  Filter,
  MoreVertical,
  Printer,
  QrCode,
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  Banknote,
  CreditCard,
} from "lucide-react";
import { getOrders } from "../../../lib/api";
import { useAppLanguage } from "../../../lib/language";
import { getSocket } from "../../../lib/socket";
import { useAppTheme } from "../../../lib/theme";
import type { Order } from "../../../lib/types";
import {
  getProfileImage,
  getProfileVersionSnapshot,
  getServerProfileVersionSnapshot,
  resolveStaffProfileImage,
  subscribeToProfileChanges,
} from "../../../lib/profile";

const RIEL_RATE = 4100;

function money(value: number | string) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function moneyRiel(value: number | string) {
  const num = Number(value || 0);
  const riel = Math.round(num * RIEL_RATE);
  return `${riel.toLocaleString("en-US")}៛`;
}

function formatDate(iso: string) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "-";
    return (
      d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) +
      ", " +
      d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    );
  } catch {
    return "-";
  }
}

function cashierName(inv: any) {
  if (inv.userName) return inv.userName;
  if (inv.createdBy?.name) return inv.createdBy.name;
  if (inv.user?.name) return inv.user.name;
  if (inv.notes) {
    const lines = inv.notes.split("\n");
    const foundLine = lines.find((l: string) => l.toLowerCase().includes("by:") || l.toLowerCase().includes("cashier:"));
    if (foundLine) return foundLine.replace(/.*(by|cashier):\s*/i, "").trim();
  }
  return "Cashier";
}

function cashierImage(inv: any): string | null {
  const staff = cashierName(inv);
  const userObj = inv.user || inv.createdBy;
  let rawUrl = userObj?.imageUrl || userObj?.avatar || inv.userImageUrl || inv.userAvatar || "";

  if (staff) {
    const localProfileImg = resolveStaffProfileImage(staff);
    if (localProfileImg) return localProfileImg;
  }

  if (typeof window !== "undefined") {
    try {
      const storedUser = localStorage.getItem("pos_user");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u && (u.name === staff || u.email === inv.userEmail)) {
          if (u.imageUrl) return u.imageUrl;
          const profileImg = getProfileImage({ id: u.id, name: u.name, email: u.email, role: u.roleName || "USER" });
          if (profileImg) return profileImg;
        }
      }
    } catch {}
  }

  if (rawUrl) {
    if (rawUrl.startsWith("data:image/") || /^https?:\/\//i.test(rawUrl)) return rawUrl;
    const apiOrigin = process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, "")
      : "http://localhost:5000";
    return `${apiOrigin}${rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`}`;
  }
  return null;
}

function paymentMethod(inv: any) {
  const pm = (inv.paymentMethod || inv.paymentType || "").toLowerCase();
  if (pm.includes("qr") || pm.includes("khqr") || pm.includes("aba")) {
    return {
      label: "ABA KHQR",
      type: "khqr" as const,
      badge: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40",
    };
  }
  if (pm.includes("card") || pm.includes("credit")) {
    return {
      label: "Card",
      type: "card" as const,
      badge: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/40",
    };
  }
  return {
    label: "Cash",
    type: "cash" as const,
    badge: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40",
  };
}

function tableTypeLabel(inv: any) {
  const tableName = inv.table?.name || inv.tableName || inv.tableNo;
  if (tableName) {
    const cleanName = String(tableName).replace(/^table\s*/i, "T-");
    return { label: cleanName, type: "Dine-in", isTakeout: false };
  }
  return { label: "Takeout", type: "Takeout", isTakeout: true };
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function dayInputValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function monthInputValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

let cachedOrders: Order[] | null = null;

export default function InvoicesPage() {
  const language = useAppLanguage();
  const [theme] = useAppTheme();
  const dark = theme === "dark";

  useSyncExternalStore(
    subscribeToProfileChanges,
    getProfileVersionSnapshot,
    getServerProfileVersionSnapshot
  );

  const [orders, setOrders] = useState<Order[]>(cachedOrders || []);
  const [loading, setLoading] = useState(!cachedOrders);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  
  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "month" | "year">("month");
  const [selectedDay, setSelectedDay] = useState(() => dayInputValue(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(() => monthInputValue(new Date()));
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);

  useEffect(() => {
    cachedOrders = orders;
  }, [orders]);

  useEffect(() => {
    let mounted = true;
    getOrders()
      .then((data) => {
        if (mounted && Array.isArray(data)) {
          cachedOrders = data;
          setOrders(cachedOrders);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const socket = getSocket();
    if (socket) {
      const handleOrderUpdate = (order: any) => {
        if (!order) return;
        setOrders((prev) => {
          const idx = prev.findIndex((o) => o.id === order.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...order };
            return next;
          }
          return [order, ...prev];
        });
      };

      const handleOrderDelete = (payload: any) => {
        const id = typeof payload === "object" ? payload.id || payload.orderId : payload;
        if (!id) return;
        setOrders((prev) => prev.filter((o) => Number(o.id) !== Number(id)));
      };

      socket.on("order:created", handleOrderUpdate);
      socket.on("order:new", handleOrderUpdate);
      socket.on("order:updated", handleOrderUpdate);
      socket.on("order:deleted", handleOrderDelete);

      return () => {
        socket.off("order:created", handleOrderUpdate);
        socket.off("order:new", handleOrderUpdate);
        socket.off("order:updated", handleOrderUpdate);
        socket.off("order:deleted", handleOrderDelete);
      };
    }
  }, []);

  const computedFromDateStr = useMemo(() => {
    if (selectedPeriod === "day") return selectedDay;
    if (selectedPeriod === "year") return `${selectedYear}-01-01`;
    return `${selectedMonth}-01`;
  }, [selectedPeriod, selectedDay, selectedMonth, selectedYear]);

  const computedToDateStr = useMemo(() => {
    if (selectedPeriod === "day") return selectedDay;
    if (selectedPeriod === "year") return `${selectedYear}-12-31`;
    const parts = selectedMonth.split("-");
    const year = parseInt(parts[0], 10) || new Date().getFullYear();
    const month = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
    const lastDay = new Date(year, month, 0).getDate();
    return `${selectedMonth}-${String(lastDay).padStart(2, "0")}`;
  }, [selectedPeriod, selectedDay, selectedMonth]);

  const resetAllFilters = () => {
    setSearchQuery("");
    setActiveSearch("");
    setSelectedPeriod("month");
    setSelectedDay(dayInputValue(new Date()));
    setSelectedMonth(monthInputValue(new Date()));
    setSelectedYear(String(new Date().getFullYear()));
  };

  const filteredInvoices = useMemo(() => {
    return orders.filter((inv: any) => {
      if (activeSearch.trim()) {
        const q = activeSearch.trim().toLowerCase();
        const invoiceNum = (inv.orderNumber || `#${inv.id}`).toLowerCase();
        const orderId = `#${inv.id}`.toLowerCase();
        const staff = cashierName(inv).toLowerCase();
        const matches = invoiceNum.includes(q) || orderId.includes(q) || staff.includes(q);
        if (!matches) return false;
      }

      const invDate = new Date(inv.createdAt);
      if (isNaN(invDate.getTime())) return true;

      if (selectedPeriod === "day") {
        const targetDay = new Date(selectedDay);
        return (
          invDate.getFullYear() === targetDay.getFullYear() &&
          invDate.getMonth() === targetDay.getMonth() &&
          invDate.getDate() === targetDay.getDate()
        );
      }

      if (selectedPeriod === "month") {
        const [y, m] = selectedMonth.split("-").map(Number);
        return invDate.getFullYear() === y && invDate.getMonth() + 1 === m;
      }

      if (selectedPeriod === "year") {
        return invDate.getFullYear() === Number(selectedYear);
      }

      return true;
    });
  }, [orders, activeSearch, selectedPeriod, selectedDay, selectedMonth, selectedYear]);

  const isFiltered = activeSearch !== "" || selectedPeriod !== "month";

  return (
      <main className={`flex-1 overflow-y-auto ${dark ? "bg-[#232333]" : "bg-[#f8faf9]"}`}>
        <div className="mx-auto w-full max-w-[1400px] px-4 py-4 lg:px-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <div>
              <h1 className={`text-2xl font-normal ${dark ? "text-slate-100" : "text-slate-800"}`}>
                {language === "km" ? "បញ្ជីវិក្កយបត្រ" : "Invoices"}
              </h1>
              <p className="text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                {language === "km" ? "បង្ហាញវិក្កយបត្រសម្រាប់ថ្ងៃនេះ" : "Showing Invoices for Today"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if(e.key === 'Enter') setActiveSearch(searchQuery);
                  }}
                  placeholder={language === "km" ? "ស្វែងរកវិក្កយបត្រ..." : "Search Invoices..."}
                  className={`h-9 w-52 sm:w-64 rounded-xl border pl-9 pr-8 text-xs font-medium outline-none transition-all ${
                    dark
                      ? "border-[#3b3c54] bg-[#2b2c40] text-slate-100 placeholder:text-slate-400 focus:border-[#55a060]"
                      : "border-slate-200/90 bg-white text-slate-800 placeholder:text-slate-400 focus:border-[#55a060] shadow-xs"
                  }`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveSearch("");
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowFilterModal(!showFilterModal)}
                className={`h-9 px-3.5 flex items-center gap-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  showFilterModal || isFiltered
                    ? "border-[#55a060] bg-[#55a060]/10 text-[#55a060]"
                    : dark
                    ? "border-[#3b3c54] bg-[#2b2c40] text-slate-400 hover:text-slate-200"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
                title="Filter Invoices"
              >
                <Filter size={15} />
                <span>{language === "km" ? "តម្រង" : "Filter"}</span>
                {isFiltered && <span className="h-2 w-2 rounded-full bg-[#55a060] animate-pulse" />}
              </button>
            </div>
          </div>

          {isFiltered && (
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="text-xs font-semibold text-slate-400">Filters:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#55a060] text-[11px] font-bold border border-emerald-200 dark:border-emerald-900/50">
                Period: {selectedPeriod}
              </span>
              {activeSearch && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#55a060] text-[11px] font-bold border border-emerald-200 dark:border-emerald-900/50">
                  Search: "{activeSearch}"
                </span>
              )}
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-xs font-bold text-red-500 hover:underline ml-1"
              >
                Clear All
              </button>
            </div>
          )}

          <div className={`mt-4 overflow-hidden rounded-2xl border ${dark ? "border-[#3b3c54] bg-[#2b2c40]" : "border-slate-200/90 bg-white shadow-xs"}`}>
            {loading ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400">
                Loading invoices...
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400">
                No invoices found.
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                      dark
                        ? "bg-[#1e1f2e] border-[#3b3c54] text-slate-300"
                        : "bg-slate-50 border-slate-200/80 text-slate-600"
                    }`}>
                      <th className="px-4 py-3.5 whitespace-nowrap">INVOICE ID</th>
                      <th className="px-3 py-3.5 whitespace-nowrap text-center">ORDER #</th>
                      <th className="px-3 py-3.5 whitespace-nowrap text-center">TABLE / TYPE</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">CASHIER</th>
                      <th className="px-3 py-3.5 whitespace-nowrap text-center">PAYMENT</th>
                      <th className="px-3 py-3.5 whitespace-nowrap text-center">STATUS</th>
                      <th className="px-4 py-3.5 whitespace-nowrap text-right">TOTAL AMOUNT</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">DATE & TIME</th>
                      <th className="px-3 py-3.5 whitespace-nowrap text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${dark ? "divide-[#3b3c54]" : "divide-slate-100"}`}>
                    {filteredInvoices.map((inv: any, index: number) => {
                      const isVoid = inv.status === "cancelled";
                      const orderDbId = `#${inv.id}`;
                      const staff = cashierName(inv);
                      const staffImg = cashierImage(inv);
                      const total = Number(inv.totalAmount || 0);
                      const invoiceId = inv.orderNumber || `#${inv.id}`;
                      const tblInfo = tableTypeLabel(inv);
                      const payInfo = paymentMethod(inv);

                      return (
                        <tr
                          key={inv.id}
                          className={`transition-colors ${
                            dark ? "hover:bg-[#34354e]" : "hover:bg-emerald-50/40"
                          }`}
                        >
                          <td className={`px-4 py-3.5 whitespace-nowrap font-bold ${dark ? "text-slate-300" : "text-slate-700"}`}>
                            <span>{invoiceId}</span>
                          </td>

                          <td className="px-3 py-3.5 whitespace-nowrap text-center">
                            <span className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-lg px-2 text-xs font-bold ${
                              dark ? "bg-[#383a54] text-white" : "bg-slate-100 text-slate-800"
                            }`}>
                              {orderDbId}
                            </span>
                          </td>

                          <td className="px-3 py-3.5 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${
                              tblInfo.isTakeout
                                ? dark
                                  ? "bg-slate-800 text-slate-300 border border-slate-700"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                                : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40"
                            }`}>
                              {tblInfo.label}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {staffImg ? (
                                <img
                                  src={staffImg}
                                  alt={staff}
                                  className="h-7 w-7 rounded-full object-cover ring-1 ring-emerald-600/30 shadow-2xs shrink-0"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = "none";
                                    const next = e.currentTarget.nextElementSibling as HTMLElement | null;
                                    if (next) next.style.display = "flex";
                                  }}
                                />
                              ) : null}

                              <div
                                style={{ display: staffImg ? "none" : "flex" }}
                                className={`h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-2xs ${
                                  index % 4 === 0
                                    ? "bg-[#55a060]"
                                    : index % 4 === 1
                                      ? "bg-slate-700"
                                      : index % 4 === 2
                                        ? "bg-emerald-700"
                                        : "bg-amber-600"
                                }`}
                              >
                                {initials(staff)}
                              </div>
                              <span className={`font-semibold ${dark ? "text-slate-200" : "text-slate-800"}`}>
                                {staff}
                              </span>
                            </div>
                          </td>

                          <td className="px-3 py-3.5 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold border ${payInfo.badge}`}>
                              {payInfo.type === "khqr" ? (
                                <QrCode size={13} className="shrink-0" />
                              ) : payInfo.type === "card" ? (
                                <CreditCard size={13} className="shrink-0" />
                              ) : (
                                <Banknote size={13} className="shrink-0" />
                              )}
                              <span>{payInfo.label}</span>
                            </span>
                          </td>

                          <td className="px-3 py-3.5 whitespace-nowrap text-center">
                            {isVoid ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-900/50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                VOID
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/50 px-2.5 py-0.5 text-[10px] font-bold">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Paid
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap text-right">
                            <div className={`font-black text-xs ${dark ? "text-emerald-400" : "text-[#55a060]"}`}>
                              {money(total)}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400">
                              {moneyRiel(total)}
                            </div>
                          </td>

                          <td className={`px-4 py-3.5 whitespace-nowrap font-medium ${dark ? "text-slate-300" : "text-slate-500"}`}>
                            {formatDate(inv.createdAt)}
                          </td>

                          <td className="px-3 py-3.5 whitespace-nowrap text-center relative">
                            <button
                              type="button"
                              onClick={() => setActionMenuId(actionMenuId === inv.id ? null : inv.id)}
                              className={`p-1 transition-colors cursor-pointer rounded-lg ${
                                dark ? "text-slate-300 hover:text-white hover:bg-slate-700" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <MoreVertical size={16} />
                            </button>

                            {actionMenuId === inv.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-4 top-10 z-30 w-36 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#2b2c40] p-1 shadow-lg text-left animate-[userModalIn_150ms_ease-out]"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedInvoice(inv);
                                    setActionMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                                >
                                  View Details
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    window.print();
                                    setActionMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                                >
                                  Print Invoice
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      {/* DYNAMIC FILTER BACKDROP MODAL OVERLAY (100% identical to Report page filter) */}
      {showFilterModal && (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/40 flex items-center justify-center p-4 animate-[fadeIn_200ms_ease-out]"
          onClick={() => setShowFilterModal(false)}
        >
          {/* Modal container */}
          <div
            className={`relative w-full max-w-[500px] rounded-2xl border ${
              dark ? "border-[#3b3c54] bg-[#2b2c40]" : "border-slate-200 bg-white"
            } p-5 shadow-2xl flex flex-col gap-4 animate-[scaleIn_200ms_ease-out]`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`flex items-center gap-2 text-lg font-semibold ${dark ? "text-slate-100" : "text-slate-800"}`}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-slate-550"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <span>Filter</span>
            </div>

            {/* Modal Body */}
            <div className="flex flex-col gap-4">
              {/* Period select dropdown */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-500">
                  Filter
                </label>
                <div className="relative">
                  <select
                    value={selectedPeriod}
                    onChange={(event) => {
                      const period = event.target.value as "day" | "month" | "year";
                      setSelectedPeriod(period);
                      if (period === "day") {
                        setSelectedDay(dayInputValue(new Date()));
                      } else if (period === "month") {
                        setSelectedMonth(monthInputValue(new Date()));
                      } else {
                        setSelectedYear(String(new Date().getFullYear()));
                      }
                    }}
                    className={`h-10 w-full rounded-lg border ${
                      dark ? "border-slate-700 bg-[#232333] text-slate-100" : "border-slate-200 bg-white text-slate-700"
                    } px-3 pr-10 text-sm font-normal outline-none focus:border-[#55a060] transition-all cursor-pointer appearance-none`}
                  >
                    <option value="day">Today</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>

              {/* From & To inputs side-by-side displaying computed dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-500">
                    From
                  </label>
                  <input
                    type="date"
                    value={computedFromDateStr}
                    onChange={(event) => {
                      const val = event.target.value;
                      if (!val) return;
                      if (selectedPeriod === "day") {
                        setSelectedDay(val);
                      } else if (selectedPeriod === "month") {
                        setSelectedMonth(val.substring(0, 7));
                      } else {
                        setSelectedYear(val.substring(0, 4));
                      }
                    }}
                    className={`h-10 w-full rounded-lg border ${
                      dark ? "border-slate-700 bg-[#232333] text-slate-100" : "border-slate-200 bg-white text-slate-700"
                    } px-3 text-sm font-normal outline-none focus:border-[#55a060] transition-all cursor-pointer`}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-500">
                    To
                  </label>
                  <input
                    type="date"
                    value={computedToDateStr}
                    onChange={(event) => {
                      const val = event.target.value;
                      if (!val) return;
                      if (selectedPeriod === "day") {
                        setSelectedDay(val);
                      } else if (selectedPeriod === "month") {
                        setSelectedMonth(val.substring(0, 7));
                      } else {
                        setSelectedYear(val.substring(0, 4));
                      }
                    }}
                    className={`h-10 w-full rounded-lg border ${
                      dark ? "border-slate-700 bg-[#232333] text-slate-100" : "border-slate-200 bg-white text-slate-700"
                    } px-3 text-sm font-normal outline-none focus:border-[#55a060] transition-all cursor-pointer`}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  className="h-10 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-100/85 px-5 text-sm font-medium text-slate-600 transition-all cursor-pointer outline-none active:scale-[0.98]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  className="h-10 rounded-lg bg-[#55a060] hover:bg-[#498c53] px-5 text-sm font-medium text-white transition-all cursor-pointer border border-transparent outline-none active:scale-[0.98]"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px] print:hidden animate-[userModalBackdrop_180ms_ease-out]">
          <div className={`w-full max-w-md overflow-hidden rounded-3xl p-6 border shadow-2xl animate-[userModalIn_200ms_cubic-bezier(0.16,1,0.3,1)] ${
            dark ? "bg-[#2b2c40] border-[#3b3c54] text-slate-100" : "bg-white border-slate-200 text-slate-800"
          }`}>
            <div className={`flex items-center justify-between pb-4 border-b ${dark ? "border-slate-700" : "border-slate-100"}`}>
              <div>
                <h3 className={`text-lg font-bold ${dark ? "text-slate-100" : "text-slate-800"}`}>
                  Invoice {selectedInvoice.orderNumber || `#${selectedInvoice.id}`}
                </h3>
                <p className="text-xs font-medium text-slate-400 mt-0.5">
                  {formatDate(selectedInvoice.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Items List */}
            <div className="py-4 space-y-2 max-h-60 overflow-y-auto no-scrollbar">
              {Array.isArray(selectedInvoice.items) && selectedInvoice.items.length > 0 ? (
                selectedInvoice.items.map((item: any, i: number) => (
                  <div key={i} className={`flex justify-between items-center text-xs font-medium ${dark ? "text-slate-300" : "text-slate-700"}`}>
                    <span>{item.quantity}x {item.name || item.product?.name}</span>
                    <span className="font-bold">{money((item.price || item.unitPrice || 0) * item.quantity)}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No item breakdown available.</p>
              )}
            </div>

            {/* Totals */}
            <div className={`pt-3 border-t space-y-1.5 text-xs text-slate-500 font-semibold ${dark ? "border-slate-700 text-slate-400" : "border-slate-100 text-slate-500"}`}>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{money(selectedInvoice.subtotal || selectedInvoice.totalAmount)}</span>
              </div>
              <div className={`flex justify-between font-bold text-sm pt-2 border-t ${dark ? "border-slate-700 text-slate-100" : "border-slate-100 text-slate-800"}`}>
                <span>Total</span>
                <span className="text-[#55a060] dark:text-emerald-400">{money(selectedInvoice.totalAmount)}</span>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                  dark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 rounded-xl bg-[#55a060] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#488c52] transition-colors cursor-pointer"
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
