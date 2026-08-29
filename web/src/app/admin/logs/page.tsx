"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useAppTheme } from "../../../lib/theme";
import { useAppLanguage } from "../../../lib/language";
import TopBar from "../../../components/TopBar";
import AnimatedToast from "../../../components/AnimatedToast";
import { getAuditLogs, clearAuditLogs } from "../../../lib/api";

type AuditLog = {
  id: number;
  userName: string;
  userRole: string;
  action: string;
  ipAddress?: string;
  status: "SUCCESS" | "FAILED";
  details?: string;
  createdAt: string;
};

const DEFAULT_DEMO_LOGS: AuditLog[] = [];

export default function AdminLogsPage() {
  const [theme] = useAppTheme();
  const language = useAppLanguage();
  const dark = theme === "dark";

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditStatusFilter, setAuditStatusFilter] = useState("all");
  const [auditActionFilter, setAuditActionFilter] = useState("all");
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);
  const [message, setMessage] = useState("");

  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-slate-200/90";
  const textPrimary = dark ? "text-slate-100" : "text-slate-800";
  const textSecondary = dark ? "text-slate-400" : "text-slate-500";

  const [isClearing, setIsClearing] = useState(false);

  // Load audit logs
  const loadAuditLogs = async (search = auditSearch, status = auditStatusFilter, action = auditActionFilter, page = auditPage) => {
    setAuditLoading(true);
    try {
      const res = await getAuditLogs({
        search,
        status: status === "all" ? undefined : status,
        action: action === "all" ? undefined : action,
        page,
        limit: 8,
      });
      const itemsList = (res as any)?.items || (res as any)?.logs;
      if (res && Array.isArray(itemsList)) {
        setAuditLogs(itemsList);
        setAuditTotal(res.total ?? itemsList.length);
        setAuditTotalPages(res.totalPages || Math.max(1, Math.ceil((res.total ?? itemsList.length) / 8)));
      } else {
        setAuditLogs([]);
        setAuditTotal(0);
        setAuditTotalPages(1);
      }
    } catch {
      setAuditLogs([]);
      setAuditTotal(0);
      setAuditTotalPages(1);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleResetAuditLogs = async () => {
    if (!window.confirm(language === "km" ? "តើអ្នកប្រាកដជាចង់លុបទិន្នន័យកំណត់ត្រាសកម្មភាពទាំងអស់មែនទេ?" : "Are you sure you want to clear all audit log data?")) {
      return;
    }
    setIsClearing(true);
    try {
      await clearAuditLogs();
      setAuditLogs([]);
      setAuditTotal(0);
      setAuditTotalPages(1);
      setMessage(language === "km" ? "ទិន្នន័យកំណត់ត្រាត្រូវ បានលុបរួចរាល់!" : "Audit log data reset successfully!");
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message || "Failed to clear audit logs");
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  return (
    <main className={`flex flex-1 flex-col overflow-y-auto ${dark ? "bg-[#232333]" : "bg-white"}`}>
      
      {/* Toast Notification */}
      {message && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <AnimatedToast message={message} onClose={() => setMessage("")} type="success" />
        </div>
      )}

      <div className="flex-1 mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-6">
        
        {/* Page Breadcrumb & Title */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-400">
              <Link href="/admin/users" className="hover:text-[#55a060]">Auth & Users</Link>
              <ChevronRight size={12} />
              <span className="text-[#55a060]">Admin Log</span>
            </div>
            <h1 className={`text-2xl font-medium tracking-normal ${textPrimary}`}>
              {language === "km" ? "កំណត់ត្រាសកម្មភាពបុគ្គលិក & ប្រព័ន្ធ" : "Staff & System Audit Logs"}
            </h1>
            <p className="mt-0.5 text-xs text-slate-400 font-normal">
              {language === "km" ? "ពិនិត្យប្រវត្តិការចូលប្រើប្រាស់ សុវត្ថិភាព និងការកែប្រែទិន្នន័យប្រព័ន្ធ" : "Track authentication history, security alerts, and admin updates."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetAuditLogs}
              disabled={isClearing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 px-4 text-xs font-bold text-rose-600 dark:text-rose-400 shadow-xs hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Trash2 size={14} className={isClearing ? "animate-spin" : ""} />
              {language === "km" ? "លុបទិន្នន័យ (Reset Data)" : "Reset Data"}
            </button>

            <button
              type="button"
              onClick={() => {
                loadAuditLogs(auditSearch, auditStatusFilter, auditActionFilter, auditPage);
                setMessage("Audit logs refreshed.");
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#55a060] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#488c52] transition-all cursor-pointer active:scale-95"
            >
              <RefreshCw size={14} className={auditLoading ? "animate-spin" : ""} />
              {language === "km" ? "ថ្មី/Refresh" : "Refresh Logs"}
            </button>
          </div>
        </div>

        {/* Main Audit Log Card */}
        <div className={`rounded-2xl border ${surface} ${borderCol} overflow-hidden shadow-none`}>
          
          {/* Header & Filter Controls Bar */}
          <div className={`p-4 border-b ${borderCol} flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${dark ? "bg-[#232333]/60" : "bg-slate-50/70"}`}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#55a060]/10 text-[#55a060]">
                <FileText size={18} />
              </div>
              <div>
                <h3 className={`text-sm font-semibold ${textPrimary}`}>Audit History Log</h3>
                <p className="text-[11px] text-slate-400 font-normal">Showing real-time authentication events & admin updates</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-56">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => {
                    setAuditSearch(e.target.value);
                    loadAuditLogs(e.target.value, auditStatusFilter, auditActionFilter, 1);
                  }}
                  placeholder="Search staff, IP, device..."
                  className={`h-9 w-full rounded-xl border pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-[#55a060] ${
                    dark ? "border-slate-700 bg-[#232333] text-slate-100" : "border-slate-200 bg-white text-slate-800"
                  }`}
                />
              </div>

              {/* Action Filter Dropdown */}
              <select
                value={auditActionFilter}
                onChange={(e) => {
                  setAuditActionFilter(e.target.value);
                  loadAuditLogs(auditSearch, auditStatusFilter, e.target.value, 1);
                }}
                className={`h-9 rounded-xl border px-3 text-xs font-medium outline-none transition focus:border-[#55a060] cursor-pointer ${
                  dark ? "border-slate-700 bg-[#232333] text-slate-100" : "border-slate-200 bg-white text-slate-800"
                }`}
              >
                <option value="all">{language === "km" ? "គ្រប់សកម្មភាព" : "All Actions"}</option>
                <option value="LOGIN">LOGIN</option>
                <option value="FAILED_LOGIN">FAILED_LOGIN</option>
                <option value="USER_CREATE">USER_CREATE</option>
                <option value="USER_UPDATE">USER_UPDATE</option>
                <option value="SETTING_UPDATE">SETTING_UPDATE</option>
              </select>

              {/* Status Filter Dropdown */}
              <select
                value={auditStatusFilter}
                onChange={(e) => {
                  setAuditStatusFilter(e.target.value);
                  loadAuditLogs(auditSearch, e.target.value, auditActionFilter, 1);
                }}
                className={`h-9 rounded-xl border px-3 text-xs font-medium outline-none transition focus:border-[#55a060] cursor-pointer ${
                  dark ? "border-slate-700 bg-[#232333] text-slate-100" : "border-slate-200 bg-white text-slate-800"
                }`}
              >
                <option value="all">{language === "km" ? "គ្រប់ស្ថានភាព" : "All Status"}</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto min-h-[420px]">
            <table className="w-full text-left text-xs table-fixed border-collapse">
              <thead>
                <tr className={`border-b ${dark ? "bg-[#232333] border-[#4e4f6e]" : "bg-slate-50/80 border-slate-200/80"}`}>
                  <th className={`w-[18%] px-5 py-3.5 font-bold ${textSecondary}`}>{language === "km" ? "ឈ្មោះបុគ្គលិក" : "STAFF NAME"}</th>
                  <th className={`w-[11%] px-5 py-3.5 font-bold ${textSecondary}`}>{language === "km" ? "តួនាទី" : "ROLE"}</th>
                  <th className={`w-[15%] px-5 py-3.5 font-bold ${textSecondary}`}>{language === "km" ? "សកម្មភាព" : "ACTION"}</th>
                  <th className={`w-[26%] px-5 py-3.5 font-bold ${textSecondary}`}>{language === "km" ? "ព័ត៌មានលម្អិត" : "DETAILS"}</th>
                  <th className={`w-[12%] px-5 py-3.5 font-bold ${textSecondary}`}>IP / DEVICE</th>
                  <th className={`w-[10%] px-5 py-3.5 font-bold ${textSecondary}`}>{language === "km" ? "ស្ថានភាព" : "STATUS"}</th>
                  <th className={`w-[14%] px-5 py-3.5 font-bold ${textSecondary}`}>{language === "km" ? "ពេលវេលា" : "TIME"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <tr key={log.id} className={`h-[50px] transition-colors ${dark ? "hover:bg-white/[0.03]" : "hover:bg-slate-50/60"}`}>
                      <td className={`px-5 py-3.5 font-semibold text-xs truncate ${textPrimary}`} title={log.userName}>
                        {log.userName}
                      </td>
                      <td className={`px-5 py-3.5 text-xs font-normal truncate text-slate-400`}>
                        {log.userRole}
                      </td>
                      <td className={`px-5 py-3.5 text-xs font-bold truncate ${textPrimary}`}>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          log.action.includes("LOGIN") && log.status === "SUCCESS"
                            ? "bg-emerald-50 text-[#55a060] dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800"
                            : log.action.includes("FAILED") || log.status === "FAILED"
                            ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800"
                            : "bg-cyan-50 text-[#03c3ec] dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800"
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className={`px-5 py-3.5 text-xs font-medium truncate ${textPrimary}`} title={log.details || "-"}>
                        {log.details || "-"}
                      </td>
                      <td className={`px-5 py-3.5 font-mono text-xs truncate text-slate-400`}>
                        {log.ipAddress || "127.0.0.1"}
                      </td>
                      <td className="px-5 py-3.5 truncate">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          log.status === "SUCCESS"
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${log.status === "SUCCESS" ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {log.status}
                        </span>
                      </td>
                      <td className={`px-5 py-3.5 text-xs truncate text-slate-400`}>
                        {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className={`py-12 text-center text-xs ${textSecondary}`}>
                      {language === "km" ? "មិនទាន់មានកំណត់ត្រា Login ឡើយ" : "No audit logs found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t ${borderCol}`}>
            <div className={`text-xs font-medium text-slate-400`}>
              {language === "km"
                ? `បង្ហាញ ${auditLogs.length > 0 ? (auditPage - 1) * 8 + 1 : 0} ដល់ ${Math.min(auditPage * 8, auditTotal)} នៃ ${auditTotal} កំណត់ត្រា`
                : `Showing ${auditLogs.length > 0 ? (auditPage - 1) * 8 + 1 : 0} to ${Math.min(auditPage * 8, auditTotal)} of ${auditTotal} entries`}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => { const prev = Math.max(1, auditPage - 1); setAuditPage(prev); loadAuditLogs(auditSearch, auditStatusFilter, auditActionFilter, prev); }}
                disabled={auditPage <= 1}
                className={`flex h-8 w-8 items-center justify-center rounded-xl border text-xs transition-all disabled:opacity-40 cursor-pointer ${
                  dark ? "border-slate-700 bg-[#232333] text-slate-300 hover:bg-white/10" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <ChevronLeft size={15} />
              </button>
              {(() => {
                const maxVisiblePages = 5;
                let startPage = Math.max(1, auditPage - 2);
                let endPage = Math.min(auditTotalPages, startPage + maxVisiblePages - 1);
                if (endPage - startPage + 1 < maxVisiblePages) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                }
                const visiblePages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

                return visiblePages.map((pNum) => (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => { setAuditPage(pNum); loadAuditLogs(auditSearch, auditStatusFilter, auditActionFilter, pNum); }}
                    className={`h-8 w-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      auditPage === pNum
                        ? "bg-[#55a060] text-white shadow-xs"
                        : `border ${dark ? "border-slate-700 bg-[#232333] text-slate-300 hover:bg-white/10" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`
                    }`}
                  >
                    {pNum}
                  </button>
                ));
              })()}
              <button
                type="button"
                onClick={() => { const next = Math.min(auditTotalPages, auditPage + 1); setAuditPage(next); loadAuditLogs(auditSearch, auditStatusFilter, auditActionFilter, next); }}
                disabled={auditPage >= auditTotalPages}
                className={`flex h-8 w-8 items-center justify-center rounded-xl border text-xs transition-all disabled:opacity-40 cursor-pointer ${
                  dark ? "border-slate-700 bg-[#232333] text-slate-300 hover:bg-white/10" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
