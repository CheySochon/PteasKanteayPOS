"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Search,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  Columns,
  Grid,
  Download,
  UsersRound,
  LayoutDashboard,
  Settings,
  Store,
  UserRound,
  FileText,
  ReceiptText,
  ChefHat,
  Armchair,
  Boxes,
  CreditCard,
  SlidersHorizontal,
  MoreHorizontal,
  MoreVertical,
  FolderTree,
} from "lucide-react";
import { useAppTheme } from "../../../lib/theme";
import { useAppLanguage } from "../../../lib/language";
import AnimatedToast from "../../../components/AnimatedToast";
import { getRoles, updateRole, createRole, deleteRole, getSystemRules, saveSystemRules } from "../../../lib/api";
import type { Role } from "../../../lib/types";
import { getSocket } from "../../../lib/socket";

export type SystemRule = {
  id: number;
  title: string;
  name: string;
  iconName: string;
  weigh: number;
  status: "Normal" | "Disabled";
  ismenu: boolean;
};

const DEFAULT_RULES: SystemRule[] = [
  { id: 1, title: "Dashboard", name: "dashboard", iconName: "LayoutDashboard", weigh: 143, status: "Normal", ismenu: true },
  { id: 2, title: "General Settings", name: "general", iconName: "Settings", weigh: 137, status: "Normal", ismenu: true },
  { id: 5, title: "Auth & Users", name: "auth", iconName: "UsersRound", weigh: 99, status: "Normal", ismenu: true },
  { id: 4, title: "POS Terminal", name: "pos", iconName: "Store", weigh: 45, status: "Normal", ismenu: true },
  { id: 66, title: "Staff Management", name: "user", iconName: "UserRound", weigh: 35, status: "Normal", ismenu: true },
  { id: 384, title: "Sales Reports", name: "reports", iconName: "FileText", weigh: 30, status: "Normal", ismenu: true },
  { id: 403, title: "Orders History", name: "orders", iconName: "ReceiptText", weigh: 25, status: "Normal", ismenu: true },
  { id: 409, title: "Kitchen (KDS)", name: "kitchen", iconName: "ChefHat", weigh: 20, status: "Normal", ismenu: true },
  { id: 422, title: "Dining Tables", name: "tables", iconName: "Armchair", weigh: 15, status: "Normal", ismenu: true },
  { id: 441, title: "Inventory Stock", name: "inventory", iconName: "Boxes", weigh: 10, status: "Normal", ismenu: true },
  { id: 447, title: "Invoices & Payments", name: "payments", iconName: "CreditCard", weigh: 5, status: "Normal", ismenu: true },
];

function getRuleIcon(iconName: string) {
  switch (iconName) {
    case "LayoutDashboard": return LayoutDashboard;
    case "Settings": return Settings;
    case "UsersRound": return UsersRound;
    case "Store": return Store;
    case "UserRound": return UserRound;
    case "FileText": return FileText;
    case "ReceiptText": return ReceiptText;
    case "ChefHat": return ChefHat;
    case "Armchair": return Armchair;
    case "Boxes": return Boxes;
    case "CreditCard": return CreditCard;
    default: return SlidersHorizontal;
  }
}

export default function RolesPage() {
  const [theme] = useAppTheme();
  const language = useAppLanguage();
  const dark = theme === "dark";

  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("Super Admin");
  const [rules, setRules] = useState<SystemRule[]>([]);
  const [selectedRuleIds, setSelectedRuleIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [ruleFilter, setRuleFilter] = useState<"all" | "menu" | "sub" | "active">("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);
  const [actionMenuPos, setActionMenuPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);

  useEffect(() => {
    const handleClose = () => {
      setIsExportMenuOpen(false);
      setActionMenuOpen(null);
      setActionMenuPos(null);
    };
    window.addEventListener("click", handleClose);
    window.addEventListener("scroll", handleClose, true);
    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("scroll", handleClose, true);
    };
  }, []);

  // Modal State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SystemRule | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formName, setFormName] = useState("");
  const [formWeigh, setFormWeigh] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<"Normal" | "Disabled">("Normal");
  const [formIsmenu, setFormIsmenu] = useState<boolean>(true);

  // Load Rules & Roles from Backend PostgreSQL DB API & WebSockets with SWR Cache
  const loadRolesData = async (forceRefresh = false) => {
    try {
      const fetchedRoles = await getRoles();
      if (Array.isArray(fetchedRoles) && fetchedRoles.length > 0) {
        setRoles(fetchedRoles);
      }
    } catch {}

    try {
      const dbRules = await getSystemRules(forceRefresh);
      if (Array.isArray(dbRules) && dbRules.length > 0) {
        setRules(dbRules);
        return;
      }
    } catch {}

    setRules(DEFAULT_RULES);
  };

  const saveRulesToStorage = async (nextRules: SystemRule[]) => {
    setRules(nextRules);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("pos-rules-updated"));
      window.dispatchEvent(new Event("pos-groups-updated"));
    }
    try {
      await saveSystemRules(nextRules);
      const socket = getSocket();
      if (socket) {
        socket.emit("roles:updated", nextRules);
        socket.emit("permissions:updated", nextRules);
        socket.emit("rules:updated", nextRules);
      }
    } catch {
      setError("Failed to save rules to database.");
    }
  };

  useEffect(() => {
    loadRolesData();

    const socket = getSocket();
    if (socket) {
      socket.on("roles:updated", () => loadRolesData(true));
      socket.on("permissions:updated", () => loadRolesData(true));
      socket.on("rules:updated", () => loadRolesData(true));
    }

    return () => {
      if (socket) {
        socket.off("roles:updated", loadRolesData);
        socket.off("permissions:updated", loadRolesData);
        socket.off("rules:updated", loadRolesData);
      }
    };
  }, []);

  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadRolesData(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setMessage("Rule permissions refreshed from database.");
    }, 400);
  };

  // Toggle single rule Ismenu
  const toggleIsmenu = (id: number) => {
    const next = rules.map((r) => (r.id === id ? { ...r, ismenu: !r.ismenu } : r));
    saveRulesToStorage(next);
  };

  // Toggle All rules Ismenu
  const toggleAllIsmenu = () => {
    const allEnabled = rules.every((r) => r.ismenu);
    const next = rules.map((r) => ({ ...r, ismenu: !allEnabled }));
    saveRulesToStorage(next);
    setMessage(allEnabled ? "Disabled all menu permissions." : "Enabled all menu permissions.");
  };

  // Select / Deselect All Checkboxes
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRuleIds(rules.map((r) => r.id));
    } else {
      setSelectedRuleIds([]);
    }
  };

  // Toggle Single Checkbox
  const handleToggleSelect = (id: number) => {
    setSelectedRuleIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Bulk Delete
  const handleBulkDelete = () => {
    if (selectedRuleIds.length === 0) return;
    const next = rules.filter((r) => !selectedRuleIds.includes(r.id));
    saveRulesToStorage(next);
    setSelectedRuleIds([]);
    setMessage(`${selectedRuleIds.length} rules removed.`);
  };

  // Single Delete
  const handleDeleteRule = (id: number) => {
    const next = rules.filter((r) => r.id !== id);
    saveRulesToStorage(next);
    setSelectedRuleIds((prev) => prev.filter((i) => i !== id));
    setMessage("Rule deleted successfully.");
  };

  // Save Permissions to Backend DB
  const handleSavePermissions = async () => {
    setSaving(true);
    try {
      const matchedRole = roles.find((r) => r.name.toLowerCase() === selectedRole.toLowerCase());
      if (matchedRole && matchedRole.id) {
        await updateRole(matchedRole.id, { permissions: rules as any }).catch(() => null);
      }

      localStorage.setItem(`pos_role_rules_${selectedRole.toLowerCase()}`, JSON.stringify(rules));
      
      const socket = getSocket();
      if (socket) socket.emit("permissions:updated", { role: selectedRole, rules });

      setMessage(`Permissions & Rules updated successfully for "${selectedRole}".`);
      setError("");
    } catch {
      setError("Failed to save rules permissions.");
    } finally {
      setSaving(false);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingRule(null);
    setFormTitle("");
    setFormName("");
    setFormWeigh(0);
    setFormStatus("Normal");
    setFormIsmenu(true);
    setIsRuleModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (rule: SystemRule) => {
    setEditingRule(rule);
    setFormTitle(rule.title);
    setFormName(rule.name);
    setFormWeigh(rule.weigh);
    setFormStatus(rule.status);
    setFormIsmenu(rule.ismenu);
    setIsRuleModalOpen(true);
  };

  // Submit Modal
  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingRule) {
      const next = rules.map((r) =>
        r.id === editingRule.id
          ? {
              ...r,
              title: formTitle.trim(),
              name: formName.trim().toLowerCase() || formTitle.trim().toLowerCase(),
              weigh: formWeigh,
              status: formStatus,
              ismenu: formIsmenu,
            }
          : r
      );
      saveRulesToStorage(next);
      setMessage(`Rule "${formTitle}" updated.`);
    } else {
      const newId = rules.length > 0 ? Math.max(...rules.map((r) => r.id)) + 1 : 1;
      const newRule: SystemRule = {
        id: newId,
        title: formTitle.trim(),
        name: formName.trim().toLowerCase() || formTitle.trim().toLowerCase(),
        iconName: "SlidersHorizontal",
        weigh: formWeigh,
        status: formStatus,
        ismenu: formIsmenu,
      };
      const next = [...rules, newRule];
      saveRulesToStorage(next);
      setMessage(`Rule "${formTitle}" created.`);
    }
    setIsRuleModalOpen(false);
  };

  // Filtered Rules List
  const filteredRules = useMemo(() => {
    let result = rules;

    if (ruleFilter === "menu") {
      result = result.filter((r) => r.ismenu);
    } else if (ruleFilter === "sub") {
      result = result.filter((r) => !r.ismenu);
    } else if (ruleFilter === "active") {
      result = result.filter((r) => r.status === "Normal" || !r.status);
    }

    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase();
    return result.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        String(r.id).includes(q)
    );
  }, [rules, searchQuery, ruleFilter]);

  const handleExportCSV = () => {
    if (rules.length === 0) return;
    const headers = ["No.", "Title", "Name", "Weigh", "Status", "Is Menu"];
    const rows = rules.map((r, idx) => [
      idx + 1,
      `"${r.title.replace(/"/g, '""')}"`,
      `"${r.name.replace(/"/g, '""')}"`,
      r.weigh,
      r.status || "Normal",
      r.ismenu ? "Yes" : "No",
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system_rules_matrix_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export PDF (.pdf)
  const handleExportPDF = async () => {
    if (rules.length === 0) {
      setError(language === "km" ? "គ្មានទិន្នន័យសិទ្ធិប្រព័ន្ធសម្រាប់ Export ទេ" : "No system rules data to export.");
      return;
    }

    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();
      const nowStr = new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      // Title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("SYSTEM RULES & MATRIX DIRECTORY REPORT", 14, 18);

      // Report Meta
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Generated: ${nowStr}   |   Total Rules: ${rules.length}   |   Active: ${rules.filter((r) => r.status === "Normal" || !r.status).length}`,
        14,
        25
      );

      const tableRows = filteredRules.map((r, idx) => [
        String(idx + 1),
        r.title,
        r.name,
        String(r.weigh),
        r.status || "Normal",
        r.ismenu ? "Yes" : "No",
      ]);

      autoTable(doc, {
        startY: 30,
        head: [["No.", "Title", "Name", "Weigh", "Status", "Is Menu"]],
        body: tableRows,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [85, 160, 96], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      doc.save(`system_rules_matrix_${new Date().toISOString().slice(0, 10)}.pdf`);
      setMessage(language === "km" ? "ទាញយក File PDF សិទ្ធិប្រព័ន្ធជោគជ័យ!" : "System rules PDF report downloaded successfully.");
    } catch (err) {
      console.error("PDF export failed:", err);
      setError(language === "km" ? "បរាជ័យក្នុងការទាញយក PDF" : "Failed to generate PDF document.");
    }
  };

  const textPrimary = dark ? "text-slate-100" : "text-[#2c3e50]";
  const textSecondary = dark ? "text-slate-400" : "text-[#64748b]";
  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-slate-200/90";

  return (
    <main className={`flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${dark ? "bg-[#232333]" : "bg-[#f8faf9]"}`}>
      
      {/* Toast Notifications */}
      {message && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <AnimatedToast message={message} onClose={() => setMessage("")} type="success" />
        </div>
      )}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <AnimatedToast message={error} onClose={() => setError("")} type="error" />
        </div>
      )}

      <div className="mx-auto w-full max-w-[1400px] px-4 py-4 lg:px-6">
        
        {/* Page Breadcrumb & Title */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-400">
              <Link href="/admin/users" className="hover:text-[#55a060] transition-colors">Auth & Users</Link>
              <ChevronRight size={12} />
              <span className="text-[#55a060]">{language === "km" ? "សិទ្ធិប្រើប្រាស់" : "Permissions"}</span>
            </div>
            <h1 className={`text-2xl font-medium tracking-normal text-[#2c3e50] dark:text-slate-100 mb-1`}>
              {language === "km" ? "កំណត់សិទ្ធិប្រើប្រាស់ (Permissions & Access Control)" : "Permissions & Access Control"}
            </h1>
            <p className="text-xs text-slate-400 font-normal">
              {language === "km" ? "កំណត់សិទ្ធិចូលប្រើប្រាស់ផ្នែក និងមុខងារផ្សេងៗក្នុងប្រព័ន្ធ POS" : "Configure module access rights and granular feature permissions."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Export Dropdown Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExportMenuOpen((prev) => !prev);
                }}
                className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  dark ? "border-[#3b3c54] bg-[#2b2c40] text-[#55a060] hover:bg-[#34354e]" : "border-emerald-200 bg-emerald-50/60 text-[#55a060] hover:bg-emerald-100/60"
                }`}
              >
                <Download size={14} />
                <span>{language === "km" ? "ទាញយកទិន្នន័យ (Export)" : "Export"}</span>
                <ChevronDown size={13} className={`transition-transform duration-200 ${isExportMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {isExportMenuOpen && (
                <div
                  className={`absolute right-0 top-full mt-1.5 z-30 w-52 rounded-xl border p-2 shadow-lg transition-all animate-[dropdownScale_150ms_ease-out] ${
                    dark ? "border-slate-700 bg-[#232333] text-slate-200" : "border-slate-200/90 bg-white text-slate-800"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      handleExportCSV();
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors text-left cursor-pointer ${
                      dark ? "hover:bg-slate-800/70 text-slate-100" : "hover:bg-slate-50 text-[#2c3e50]"
                    }`}
                  >
                    <Download size={15} className="text-[#55a060] shrink-0" />
                    <span>{language === "km" ? "ទាញយក CSV" : "Download CSV"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      handleExportPDF();
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors text-left cursor-pointer ${
                      dark ? "hover:bg-slate-800/70 text-slate-100" : "hover:bg-slate-50 text-[#2c3e50]"
                    }`}
                  >
                    <FileText size={15} className="text-[#55a060] shrink-0" />
                    <span>{language === "km" ? "ទាញយក PDF (.pdf)" : "Download PDF (.pdf)"}</span>
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#55a060] hover:bg-[#478851] text-white px-4 text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Plus size={15} />
              {language === "km" ? "បន្ថែមសិទ្ធិថ្មី" : "New Rule"}
            </button>
          </div>
        </div>

        {/* TOP KPI CARDS (Matching Admin Log Style) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {/* Card 1: Total Rules */}
          <div className={`p-4 rounded-2xl border ${surface} ${borderCol} shadow-xs flex items-center gap-3.5`}>
            <div className="h-11 w-11 rounded-xl bg-[#55a060]/10 text-[#55a060] dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                {language === "km" ? "ច្បាប់សិទ្ធិសរុប" : "Total System Rules"}
              </div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {rules.length}
              </div>
            </div>
          </div>

          {/* Card 2: Menu Modules */}
          <div className={`p-4 rounded-2xl border ${surface} ${borderCol} shadow-xs flex items-center gap-3.5`}>
            <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center shrink-0">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                {language === "km" ? "ម៉ូឌុលមេនូ (Menu Modules)" : "Menu Modules"}
              </div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {rules.filter((r) => r.ismenu).length}
              </div>
            </div>
          </div>

          {/* Card 3: Active Status */}
          <div className={`p-4 rounded-2xl border ${surface} ${borderCol} shadow-xs flex items-center gap-3.5`}>
            <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                {language === "km" ? "សិទ្ធិសកម្ម" : "Active Rules"}
              </div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {rules.filter((r) => r.status === "Normal" || !r.status).length}
              </div>
            </div>
          </div>

          {/* Card 4: Action Permissions */}
          <div className={`p-4 rounded-2xl border ${surface} ${borderCol} shadow-xs flex items-center gap-3.5`}>
            <div className="h-11 w-11 rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                {language === "km" ? "សិទ្ធិរង (Sub Permissions)" : "Sub Permissions"}
              </div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {rules.filter((r) => !r.ismenu).length}
              </div>
            </div>
          </div>
        </div>

        {/* MAIN RULE TABLE PANEL */}
        <div className={`rounded-2xl border ${dark ? "bg-[#2b2c40] border-[#4e4f6e]" : "bg-white border-slate-200/90"} shadow-xs overflow-hidden`}>
          
          {/* TOP ACTION TOOLBAR */}
          <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
            dark ? "border-[#4e4f6e] bg-[#232333]/50" : "border-slate-200/80 bg-slate-50/50"
          }`}>
            
            {/* Left Section: Table Title */}
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#55a060]" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {language === "km" ? "បញ្ជីសិទ្ធិប្រព័ន្ធ" : "System Rules & Matrix Directory"}
              </h2>
              <span className="ml-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {filteredRules.length}
              </span>
            </div>

            {/* Right Tools: Filter Dropdown, Search Input, Refresh Button */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              
              {/* Filter Dropdown */}
              <div className="relative">
                <select
                  value={ruleFilter}
                  onChange={(e) => setRuleFilter(e.target.value as any)}
                  className={`h-8 rounded-lg border px-3 pr-7 text-xs outline-none transition cursor-pointer font-medium focus:border-[#55a060] ${
                    dark ? "border-slate-700 bg-[#232333] text-slate-200" : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <option value="all">{language === "km" ? "សិទ្ធិទាំងអស់ (All Rules)" : "All System Rules"}</option>
                  <option value="menu">{language === "km" ? "ម៉ូឌុលមេនូ (Menu Modules)" : "Menu Modules Only"}</option>
                  <option value="sub">{language === "km" ? "សិទ្ធិរង (Sub Permissions)" : "Sub Permissions Only"}</option>
                  <option value="active">{language === "km" ? "សិទ្ធិសកម្ម (Active Only)" : "Active Rules Only"}</option>
                </select>
              </div>

              {/* Search Input */}
              <div className="relative flex-1 sm:w-60">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === "km" ? "ស្វែងរកសិទ្ធិ..." : "Search rules..."}
                  className={`h-8 w-full rounded-lg border pl-8 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-[#55a060] ${
                    dark ? "border-slate-700 bg-[#232333] text-slate-100" : "border-slate-300 bg-white text-slate-800"
                  }`}
                />
              </div>

              {/* 🔄 Refresh Icon Button (Far Right) */}
              <button
                type="button"
                onClick={handleRefresh}
                title="Refresh Rules List"
                className={`h-8 w-8 flex items-center justify-center rounded-lg border transition cursor-pointer shrink-0 ${
                  dark
                    ? "border-slate-700 bg-[#232333] text-slate-200 hover:bg-[#34354e]"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <RefreshCw size={14} className={isRefreshing ? "animate-spin text-[#55a060]" : "text-slate-600 dark:text-slate-300"} />
              </button>
            </div>
          </div>

          {/* TABLE MATRIX MATCHING TARGET SCREENSHOT */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b text-slate-700 dark:text-slate-300 font-semibold ${
                  dark ? "bg-[#232333]/80 border-[#4e4f6e]" : "bg-slate-50 border-slate-200/80"
                }`}>
                  <th className="py-3.5 px-4 w-16 font-bold">No.</th>
                  <th className="py-3.5 px-4 w-40 font-bold">Title</th>
                  <th className="py-3.5 px-4 w-16 text-center font-bold">Icon</th>
                  <th className="py-3.5 px-4 font-bold">Name</th>
                  <th className="py-3.5 px-4 w-24 text-center font-bold">Weigh</th>
                  <th className="py-3.5 px-4 w-28 font-bold">Status</th>
                  <th className="py-3.5 px-4 w-24 text-center font-bold">Ismenu</th>
                  <th className="py-3.5 px-4 w-32 text-center font-bold">Operate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-normal">
                      No system rules found matching search query.
                    </td>
                  </tr>
                ) : (
                  filteredRules.map((rule, idx) => {
                    const isBottomRow = idx >= filteredRules.length - 2;
                    const RuleIcon = getRuleIcon(rule.iconName);

                    return (
                      <tr
                        key={rule.id}
                        className={`transition-colors ${
                          dark ? "hover:bg-[#232333]/50" : "hover:bg-slate-50/70"
                        }`}
                      >
                        {/* No. */}
                        <td className="py-3.5 px-4 font-normal text-slate-500 dark:text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Title (▸ Title) */}
                        <td className="py-3.5 px-4 font-normal text-slate-700 dark:text-slate-200">
                          <span className="text-slate-400 mr-1.5 select-none">▸</span>
                          {rule.title}
                        </td>

                        {/* Icon */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <RuleIcon size={13} />
                          </div>
                        </td>

                        {/* Name (lowercase identifier e.g. dashboard, general) */}
                        <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                          {rule.name}
                        </td>

                        {/* Weigh */}
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-600 dark:text-slate-300">
                          {rule.weigh}
                        </td>

                        {/* Status (● Normal) */}
                        <td className="py-3.5 px-4">
                          {rule.status === "Normal" ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              Normal
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                              <span className="h-2 w-2 rounded-full bg-slate-400" />
                              Disabled
                            </span>
                          )}
                        </td>

                        {/* Ismenu Toggle Switch */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleIsmenu(rule.id)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              rule.ismenu ? "bg-[#10b981]" : "bg-slate-300 dark:bg-slate-700"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                rule.ismenu ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </td>

                        {/* Operate / Actions (Inventory Stock Style Action Menu Dropdown) */}
                        <td className="py-3.5 px-4 text-center relative">
                          <div className="inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (actionMenuOpen === rule.id) {
                                  setActionMenuOpen(null);
                                  setActionMenuPos(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const openUpwards = rect.bottom + 160 > window.innerHeight;
                                  const menuWidth = 176;
                                  const maxLeft = typeof window !== "undefined" ? window.innerWidth - menuWidth - 20 : rect.right - menuWidth;
                                  const targetLeft = rect.right - menuWidth + 10;
                                  const calculatedLeft = Math.max(12, Math.min(maxLeft, targetLeft));
                                  setActionMenuPos({
                                    top: openUpwards ? undefined : rect.bottom + 4,
                                    bottom: openUpwards ? window.innerHeight - rect.top + 4 : undefined,
                                    left: calculatedLeft,
                                  });
                                  setActionMenuOpen(rule.id);
                                }
                              }}
                              className={`h-7 w-7 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                                dark
                                  ? "text-slate-400 hover:bg-[#34354c] hover:text-slate-200"
                                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 border border-slate-200/60"
                              }`}
                            >
                              <MoreVertical size={16} />
                            </button>

                            {actionMenuOpen === rule.id && actionMenuPos && (
                              <div
                                style={{
                                  position: "fixed",
                                  top: actionMenuPos.top !== undefined ? `${actionMenuPos.top}px` : undefined,
                                  bottom: actionMenuPos.bottom !== undefined ? `${actionMenuPos.bottom}px` : undefined,
                                  left: `${actionMenuPos.left}px`,
                                }}
                                className={`z-[99999] w-44 rounded-xl border p-1.5 text-left shadow-2xl ${
                                  dark ? "border-[#4e4f6e] bg-[#2b2c40]" : "border-slate-200/90 bg-white"
                                } animate-[userModalIn_150ms_cubic-bezier(0.16,1,0.3,1)]`}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuOpen(null);
                                    setActionMenuPos(null);
                                    openCreateModal();
                                  }}
                                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#34354e] transition-colors cursor-pointer"
                                >
                                  <Plus size={14} className="text-[#55a060] stroke-[2.2]" />
                                  <span>{language === "km" ? "បន្ថែមសិទ្ធិរង" : "Add Sub-rule"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuOpen(null);
                                    setActionMenuPos(null);
                                    openEditModal(rule);
                                  }}
                                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#34354e] transition-colors cursor-pointer"
                                >
                                  <Edit3 size={13} className="text-cyan-500 stroke-[2]" />
                                  <span>{language === "km" ? "កែប្រែ" : "Edit Rule"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuOpen(null);
                                    setActionMenuPos(null);
                                    handleDeleteRule(rule.id);
                                  }}
                                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                >
                                  <Trash2 size={13} className="text-rose-500 stroke-[2]" />
                                  <span>{language === "km" ? "លុប" : "Delete Rule"}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT RULE MODAL */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-[2px] animate-[userModalBackdrop_180ms_ease-out]">
          <div className={`relative w-full max-w-md rounded-2xl p-6 shadow-xl border ${
            dark ? "bg-[#1e293b] border-slate-800" : "bg-white border-slate-100"
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FolderTree size={18} className="text-[#55a060]" />
                {editingRule ? "Edit Rule Permission" : "Add New System Rule"}
              </h3>
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Rule Title</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Dashboard, Orders..."
                  className={`w-full h-9 rounded-xl border px-3 text-xs outline-none focus:border-[#55a060] ${
                    dark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Permission Code (Name)</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. dashboard, orders..."
                  className={`w-full h-9 rounded-xl border px-3 text-xs outline-none focus:border-[#55a060] ${
                    dark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Weigh (Priority)</label>
                  <input
                    type="number"
                    value={formWeigh}
                    onChange={(e) => setFormWeigh(Number(e.target.value))}
                    className={`w-full h-9 rounded-xl border px-3 text-xs outline-none focus:border-[#55a060] ${
                      dark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "Normal" | "Disabled")}
                    className={`w-full h-9 rounded-xl border px-3 text-xs outline-none focus:border-[#55a060] ${
                      dark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                    }`}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Ismenu Visible</label>
                <button
                  type="button"
                  onClick={() => setFormIsmenu(!formIsmenu)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    formIsmenu ? "bg-[#10b981]" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      formIsmenu ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#55a060] hover:bg-[#488e52] text-white text-xs font-bold shadow-sm"
                >
                  {editingRule ? "Save Changes" : "Create Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
