"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import TopBar from "../../../components/TopBar";
import { getOrders } from "../../../lib/api";
import { useAppLanguage } from "../../../lib/language";
import { getSocket } from "../../../lib/socket";
import { useAppTheme } from "../../../lib/theme";
import type { Order } from "../../../lib/types";

function money(value: number | string) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(iso: string) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + ", " + d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "-";
  }
}

function dayInputValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function monthInputValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function InvoicesPage() {
  const language = useAppLanguage();
  const [theme] = useAppTheme();
  const dark = theme === "dark";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  
  // Date filter states matching Report page 100%
  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "month" | "year">("month");
  const [selectedDay, setSelectedDay] = useState(() => dayInputValue(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(() => monthInputValue(new Date()));
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    getOrders()
      .then((data) => {
        if (mounted && Array.isArray(data)) {
          setOrders(data);
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

  const filteredInvoices = useMemo(() => {
    const term = (activeSearch || searchQuery).trim().toLowerCase();
    const startObj = new Date(computedFromDateStr);
    startObj.setHours(0, 0, 0, 0);

    const endObj = new Date(computedToDateStr);
    endObj.setHours(23, 59, 59, 999);

    return orders.filter((order) => {
      // 1. Text Search Filter
      if (term) {
        const idStr = String(order.id);
        const numStr = String(order.orderNumber || "");
        const custStr = String(order.userName || order.createdBy?.name || "WALKIN").toLowerCase();
        const matchesText = idStr.includes(term) || numStr.toLowerCase().includes(term) || custStr.includes(term);
        if (!matchesText) return false;
      }

      // 2. Date Range Filter (Report Page 100% logic)
      if (order.createdAt) {
        const orderDate = new Date(order.createdAt);
        if (!isNaN(orderDate.getTime())) {
          if (orderDate < startObj || orderDate > endObj) return false;
        }
      }

      return true;
    });
  }, [orders, activeSearch, searchQuery, computedFromDateStr, computedToDateStr]);

  const isFiltered = searchQuery !== "" || activeSearch !== "";

  function resetAllFilters() {
    setSearchQuery("");
    setActiveSearch("");
    setSelectedPeriod("month");
    setSelectedDay(dayInputValue(new Date()));
    setSelectedMonth(monthInputValue(new Date()));
    setSelectedYear(String(new Date().getFullYear()));
  }

  return (
    <main className={`flex flex-1 flex-col overflow-hidden ${dark ? "bg-[#232333]" : "bg-white"}`}>
      <TopBar
        title={language === "km" ? "វិក្កយបត្រ" : "Invoices"}
        subtitle=""
        language={language}
        onLanguageChange={(nextLanguage) => {
          localStorage.setItem("pos_language", nextLanguage);
          window.dispatchEvent(new Event("pos-language-change"));
        }}
        notifications={[]}
        dark={dark}
      />

      <div className="flex-1 overflow-y-auto px-3.5 sm:px-4 pt-4 sm:pt-5 pb-6">
        <div className="mx-auto w-full max-w-[1720px] dash-animate">
          
          {/* Header Title + Controls Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <div>
              <h1 className={`text-2xl font-normal ${dark ? "text-slate-100" : "text-slate-800"}`}>
                {language === "km" ? "បញ្ជីវិក្កយបត្រ" : "Invoices"}
              </h1>
              <p className="text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                {language === "km" ? "បង្ហាញវិក្កយបត្រសម្រាប់ថ្ងៃនេះ" : "Showing Invoices for Today"}
              </p>
            </div>

            {/* Right Search Input + Green Search Button + Filter Icon */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setActiveSearch(searchQuery);
                  }}
                  placeholder={language === "km" ? "ស្វែងរកវិក្កយបត្រ..." : "Search Invoices"}
                  className={`h-9 w-48 sm:w-60 rounded-xl border px-3.5 text-xs font-medium outline-none transition-all ${
                    dark
                      ? "border-[#3b3c54] bg-[#2b2c40] text-slate-100 placeholder:text-slate-400 focus:border-[#55a060]"
                      : "border-slate-200 bg-[#f8faf9] text-slate-800 placeholder:text-slate-400 focus:border-[#55a060]"
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={() => setActiveSearch(searchQuery)}
                className="h-9 px-4 rounded-xl bg-[#55a060] hover:bg-[#488c52] text-white text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                {language === "km" ? "ស្វែងរក" : "Search"}
              </button>
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

          {/* Active Filter Badges Indicator Bar */}
          {isFiltered && (
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="text-xs font-semibold text-slate-400">Filters:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#55a060] text-[11px] font-bold border border-emerald-200 dark:border-emerald-900/50">
                Period: {selectedPeriod}
              </span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#55a060] text-[11px] font-bold border border-emerald-200 dark:border-emerald-900/50">
                  Search: "{searchQuery}"
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

          {/* Invoices Table Container */}
          <div className={`mt-4 overflow-hidden rounded-2xl border ${dark ? "border-[#3b3c54] bg-[#2b2c40]" : "border-slate-200/80 bg-white"}`}>
            {loading ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400">
                Loading invoices...
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400">
                No invoices found for today.
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                      dark
                        ? "bg-slate-800/60 border-[#3b3c54] text-slate-400"
                        : "bg-[#f0f4f1] border-slate-200/80 text-[#6b7a82]"
                    }`}>
                      <th className="px-4 py-3.5 whitespace-nowrap">INVOICE ID:</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">TOKENS</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">CUSTOMER</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">SUBTOTAL</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">TAX</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">SERVICE CHARGE</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">DISCOUNT</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">TOTAL</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">DELIVERY TYPE</th>
                      <th className="px-4 py-3.5 whitespace-nowrap">DATE</th>
                      <th className="px-4 py-3.5 whitespace-nowrap text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${dark ? "divide-[#3b3c54]" : "divide-slate-100"}`}>
                    {filteredInvoices.map((inv: any, idx: number) => {
                      const isVoid = inv.status === "cancelled";
                      const tokenNum = idx + 1;
                      const customerName = inv.userName || inv.createdBy?.name || "WALKIN";
                      const subtotal = Number(inv.subtotal || inv.totalAmount || 0);
                      const tax = Number(inv.taxAmount || 0);
                      const serviceCharge = Number(inv.serviceFee || 0);
                      const discount = Number(inv.discountAmount || 0);
                      const total = Number(inv.totalAmount || 0);
                      const deliveryType = inv.table?.name ? `Dinein (${inv.table.name})` : "-";
                      const invoiceId = inv.orderNumber || `#${inv.id}`;

                      return (
                        <tr
                          key={inv.id}
                          className={`transition-colors ${
                            dark ? "hover:bg-[#34354e]" : "hover:bg-slate-50/70"
                          }`}
                        >
                          {/* INVOICE ID */}
                          <td className="px-4 py-3.5 whitespace-nowrap font-bold text-slate-800 dark:text-slate-200">
                            <div className="flex items-center gap-2">
                              <span>{invoiceId}</span>
                              {isVoid && (
                                <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                  VOID
                                </span>
                              )}
                            </div>
                          </td>

                          {/* TOKENS */}
                          <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-slate-600 dark:text-slate-300">
                            {tokenNum}
                          </td>

                          {/* CUSTOMER */}
                          <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-slate-700 dark:text-slate-300 uppercase">
                            {customerName}
                          </td>

                          {/* SUBTOTAL */}
                          <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-slate-600 dark:text-slate-400">
                            {money(subtotal)}
                          </td>

                          {/* TAX */}
                          <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-slate-600 dark:text-slate-400">
                            {money(tax)}
                          </td>

                          {/* SERVICE CHARGE */}
                          <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-slate-600 dark:text-slate-400">
                            {money(serviceCharge)}
                          </td>

                          {/* DISCOUNT */}
                          <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-slate-600 dark:text-slate-400">
                            {money(discount)}
                          </td>

                          {/* TOTAL */}
                          <td className="px-4 py-3.5 whitespace-nowrap font-black text-slate-900 dark:text-slate-100">
                            {money(total)}
                          </td>

                          {/* DELIVERY TYPE */}
                          <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-slate-500 dark:text-slate-400">
                            {deliveryType}
                          </td>

                          {/* DATE */}
                          <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-500 dark:text-slate-400">
                            {formatDate(inv.createdAt)}
                          </td>

                          {/* ACTION */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-center relative">
                            <button
                              type="button"
                              onClick={() => setActionMenuId(actionMenuId === inv.id ? null : inv.id)}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {/* Dropdown Menu */}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/30 print:hidden animate-[userModalBackdrop_180ms_ease-out]">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-none animate-[userModalIn_200ms_cubic-bezier(0.16,1,0.3,1)]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Invoice {selectedInvoice.orderNumber || `#${selectedInvoice.id}`}
                </h3>
                <p className="text-xs font-medium text-slate-400 mt-0.5">
                  {formatDate(selectedInvoice.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Items List */}
            <div className="py-4 space-y-2 max-h-60 overflow-y-auto no-scrollbar">
              {Array.isArray(selectedInvoice.items) && selectedInvoice.items.length > 0 ? (
                selectedInvoice.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs font-medium text-slate-700">
                    <span>{item.quantity}x {item.name || item.product?.name}</span>
                    <span className="font-bold">{money(item.unitPrice * item.quantity)}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No item breakdown available.</p>
              )}
            </div>

            {/* Totals */}
            <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500 font-semibold">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{money(selectedInvoice.subtotal || selectedInvoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-800 font-bold text-sm pt-2 border-t border-slate-100">
                <span>Total</span>
                <span className="text-[#55a060]">{money(selectedInvoice.totalAmount)}</span>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
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
